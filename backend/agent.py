"""
SignSense Vision Agent
======================
The core Vision Agents SDK agent.

This module defines:
  - create_agent()  — builds and returns the configured Agent instance
  - run_agent()     — connects the agent to a specific Stream call

The agent is launched as an asyncio background task from routes/calls.py
when the frontend requests it via POST /api/calls/{call_id}/start-agent.

Architecture reminder:
  Frontend webcam → Stream WebRTC Edge → Vision Agent (here) → Roboflow processor
  → Gemini LLM → ElevenLabs TTS → back through Stream to frontend speakers
  
  FastAPI (main.py) handles only tokens + agent lifecycle, NOT video/audio.
"""

import asyncio
import logging
from typing import Callable

from dotenv import load_dotenv
from vision_agents.core import Agent, User
from vision_agents.plugins import deepgram, elevenlabs, gemini, getstream

from asl_processor import ASLGestureProcessor

load_dotenv()

logger = logging.getLogger(__name__)

# The agent user that joins the call on the backend side.
AGENT_USER = User(
    name="SignSense AI",
    id="signsense-agent",
    image="https://ui-avatars.com/api/?name=SS&background=1E3A5F&color=fff",
)


async def create_agent(
    call_id: str,
    on_transcript: Callable[[str, float], None] | None = None,
) -> Agent:
    """
    Build and return the configured SignSense Agent.

    Args:
        on_transcript: Optional callback invoked whenever the LLM produces
                       an interpreted sentence. Receives (sentence, confidence).
                       Used by routes/calls.py to push events to the SSE stream.
    """
    processor = ASLGestureProcessor(
        fps=10,
        on_gesture=on_transcript,  # forwarded to SSE
        call_id=call_id,
    )

    return Agent(
        edge=getstream.Edge(),
        agent_user=AGENT_USER,
        instructions="Read @instructions.md",
        llm=gemini.LLM("gemini-2.0-flash-lite"),
        tts=elevenlabs.TTS(),
        stt=deepgram.STT(),
        processors=[processor],
    )


async def run_agent(call_id: str, call_type: str = "default", on_transcript=None):
    """
    Connect the agent to a Stream call and block until the call ends.

    This is launched as a background asyncio task. It exits when:
      - The call ends naturally
      - The frontend disconnects
      - An error occurs

    Args:
        call_id:    The Stream call ID to join (created by the frontend or /api/calls/create).
        call_type:  Stream call type (default: "default"). Usually safe to leave as-is.
        on_transcript: Forwarded to create_agent() for SSE event emission.
    """
    agent = await create_agent(call_id=call_id, on_transcript=on_transcript)

    try:
        # Ensure the agent user exists in Stream Video so created_by_id is set correctly
        await agent.create_user()
        call = await agent.create_call(call_type, call_id)
        async with agent.join(call):
            logger.info(
                "SignSense Agent joined call",
                extra={"call_id": call_id, "call_type": call_type},
            )
            # Keep the agent alive until the call ends.
            # Vision Agents handles the event loop internally.
            await asyncio.sleep(3600)  # 1hr max session — adjust as needed
    except asyncio.CancelledError:
        logger.info(
            "SignSense Agent call cancelled / ended",
            extra={"call_id": call_id},
        )
    except Exception as e:
        logger.exception(
            "Error in SignSense Agent call",
            extra={"call_id": call_id},
        )
        raise
