"""
Calls Router — /api/calls
==========================
All endpoints the React frontend needs to:
  1. Create a call and get auth tokens
  2. Start the Vision Agent on a call
  3. Subscribe to live gesture + transcript events via SSE

Flow:
  Frontend                        FastAPI (here)               Stream / Vision Agent
  ──────                          ──────────────               ─────────────────────
  POST /api/calls/create ──────►  mint token, return call_id
  JOIN call via Stream SDK ──────────────────────────────────► Stream WebRTC
  POST /api/calls/{id}/start ──►  launch agent background task ► agent joins call
  GET  /api/calls/{id}/events ──► SSE: gesture + transcript events ◄── processor callback
"""

import asyncio
import json
import logging
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from google import genai
from sse_starlette.sse import EventSourceResponse
from stream_chat import StreamChat

from agent import run_agent
from config import settings
from models import (
    AgentStatusResponse,
    CreateCallRequest,
    CreateCallResponse,
    StartAgentRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ─── In-memory state ──────────────────────────────────────────────────────────
# In a real production app, use Redis. For the hackathon, this is fine.

# active_agents: call_id → asyncio.Task (the Vision Agent task)
active_agents: dict[str, asyncio.Task] = {}

# transcript_tasks: call_id → asyncio.Task (the transcript processor task)
transcript_tasks: dict[str, asyncio.Task] = {}

# gesture_input_queues: call_id → asyncio.Queue feeding the transcript processor
gesture_input_queues: dict[str, asyncio.Queue] = {}

# event_queues: call_id → list of asyncio.Queue (one per SSE subscriber)
event_queues: dict[str, list[asyncio.Queue]] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_stream_client() -> StreamChat:
    """Return an authenticated Stream server-side client."""
    if not settings.STREAM_API_KEY or not settings.STREAM_API_SECRET:
        raise HTTPException(
            status_code=500,
            detail="STREAM_API_KEY or STREAM_API_SECRET not configured.",
        )
    return StreamChat(
        api_key=settings.STREAM_API_KEY,
        api_secret=settings.STREAM_API_SECRET,
    )


def _push_event(call_id: str, event: dict) -> None:
    """Push an event dict to all SSE subscribers for a call."""
    for queue in event_queues.get(call_id, []):
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            pass  # Drop if subscriber is too slow


def make_on_gesture_callback(call_id: str):
    """
    Returns a callback that:
      1. Pushes raw gesture events to all SSE subscribers immediately.
      2. Feeds accepted gestures (non-[UNCLEAR]) into the gesture_input_queue
         so the transcript processor can batch them and call Gemini.
    """
    def callback(gesture_or_sentence: str, confidence: float):
        if call_id not in event_queues:
            return

        _push_event(call_id, {
            "type": "gesture",
            "gesture": gesture_or_sentence,
            "confidence": confidence,
            "timestamp": time.time(),
        })

        # Feed non-unclear gestures to the transcript processor
        if gesture_or_sentence != "[UNCLEAR]":
            q = gesture_input_queues.get(call_id)
            if q:
                try:
                    q.put_nowait(gesture_or_sentence)
                except asyncio.QueueFull:
                    pass

    return callback


async def _interpret_and_emit(call_id: str, gestures: list[str]) -> None:
    """
    Call Gemini to translate a buffered gesture sequence into an English sentence
    and emit it as a 'transcript' SSE event.
    """
    if not settings.GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set; skipping transcript generation")
        return

    sequence = " ".join(gestures)
    prompt = (
        "You are a real-time ASL interpreter giving voice to a deaf user.\n"
        "Translate the following sequence of detected ASL signs into a single, natural English sentence.\n\n"
        f"Signs: {sequence}\n\n"
        "Rules:\n"
        "- Respond with ONLY the English sentence — no explanation, no preamble.\n"
        "- Apply ASL grammar: topic-comment structure, add articles/copulas as needed.\n"
        "- If only individual letters, treat as fingerspelling and form the word.\n"
        "- Speak in first person when the user signs about themselves."
    )

    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        response = await asyncio.to_thread(
            lambda: client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=prompt,
            )
        )
        sentence = (response.text or "").strip()
        if not sentence:
            return

        logger.info(
            "Transcript generated",
            extra={"call_id": call_id, "sequence": sequence, "sentence": sentence},
        )
        _push_event(call_id, {
            "type": "transcript",
            "sentence": sentence,
            "timestamp": time.time(),
        })
    except Exception:
        logger.exception(
            "Gemini transcript generation failed",
            extra={"call_id": call_id, "sequence": sequence},
        )


async def _transcript_processor(call_id: str, gesture_queue: asyncio.Queue) -> None:
    """
    Background asyncio task that accumulates gesture labels from gesture_queue,
    and after a silence window (no new gestures for ~2.5s) calls Gemini to
    interpret the sequence and emit a 'transcript' SSE event.
    """
    gestures: list[str] = []

    try:
        while True:
            try:
                gesture = await asyncio.wait_for(gesture_queue.get(), timeout=2.5)
                gestures.append(gesture)
            except asyncio.TimeoutError:
                # Silence window elapsed — interpret accumulated gestures
                if gestures:
                    await _interpret_and_emit(call_id, list(gestures))
                    gestures = []
    except asyncio.CancelledError:
        # Task cancelled (stop_agent called) — interpret any remaining gestures
        if gestures:
            await _interpret_and_emit(call_id, list(gestures))


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create", response_model=CreateCallResponse)
async def create_call(body: CreateCallRequest):
    """
    Create a new Stream video call and return auth credentials.

    The frontend calls this first, then uses the returned token + call_id
    to join the call via the Stream Video React SDK.

    Example request:
        POST /api/calls/create
        { "user_id": "user_abc123", "user_name": "Alice" }

    Example response:
        {
          "call_id": "abc123",
          "call_type": "default",
          "token": "<stream_user_jwt>",
          "api_key": "<your_stream_api_key>"
        }
    """
    client = get_stream_client()

    call_id = f"signsense-{uuid.uuid4().hex[:8]}"

    logger.info(
        "Created new call",
        extra={
            "call_id": call_id,
            "user_id": body.user_id,
        },
    )

    # Generate a Stream user token for the frontend user.
    token = client.create_token(body.user_id)

    return CreateCallResponse(
        call_id=call_id,
        call_type="default",
        token=token,
        api_key=settings.STREAM_API_KEY,
    )


@router.post("/{call_id}/start-agent", response_model=AgentStatusResponse)
async def start_agent(
    call_id: str,
    body: StartAgentRequest,
):
    """
    Launch the Vision Agent as a background task to join an existing call.

    The frontend calls this after joining the call itself, so the agent
    joins as a second participant and starts processing the video stream.

    The agent will:
      - Join the Stream call as "SignSense AI"
      - Start the Roboflow ASL gesture detection processor
      - Pass detected gestures to Gemini LLM for interpretation
      - Speak results via ElevenLabs TTS back into the call

    Note: Only one agent per call_id is allowed.
    """
    if call_id in active_agents and not active_agents[call_id].done():
        logger.info(
            "Agent already active on call",
            extra={"call_id": call_id},
        )
        return AgentStatusResponse(
            call_id=call_id,
            agent_active=True,
            message="Agent is already active on this call.",
        )

    # Set up SSE event queue for this call
    if call_id not in event_queues:
        event_queues[call_id] = []

    # Set up gesture input queue for the transcript processor
    gesture_q: asyncio.Queue = asyncio.Queue(maxsize=200)
    gesture_input_queues[call_id] = gesture_q

    on_gesture = make_on_gesture_callback(call_id)

    logger.info(
        "Starting agent background task for call",
        extra={
            "call_id": call_id,
            "call_type": body.call_type,
        },
    )

    # Launch Vision Agent as background asyncio task
    agent_task = asyncio.create_task(
        run_agent(
            call_id=call_id,
            call_type=body.call_type,
            on_transcript=on_gesture,
        )
    )
    active_agents[call_id] = agent_task

    # Launch transcript processor as a separate background task
    transcript_task = asyncio.create_task(
        _transcript_processor(call_id, gesture_q)
    )
    transcript_tasks[call_id] = transcript_task

    return AgentStatusResponse(
        call_id=call_id,
        agent_active=True,
        message="Agent started successfully.",
    )


@router.delete("/{call_id}/stop-agent", response_model=AgentStatusResponse)
async def stop_agent(call_id: str):
    """
    Cancel the Vision Agent task for a call (e.g., user ends the session).
    """
    if call_id not in active_agents:
        raise HTTPException(status_code=404, detail="No active agent for this call.")

    agent_task = active_agents.pop(call_id)

    logger.info(
        "Stopping agent for call",
        extra={"call_id": call_id},
    )
    if not agent_task.done():
        agent_task.cancel()

    # Cancel the transcript processor task
    transcript_task = transcript_tasks.pop(call_id, None)
    if transcript_task and not transcript_task.done():
        transcript_task.cancel()

    # Clean up per-call queues
    gesture_input_queues.pop(call_id, None)
    event_queues.pop(call_id, None)

    return AgentStatusResponse(
        call_id=call_id,
        agent_active=False,
        message="Agent stopped.",
    )


@router.get("/{call_id}/status", response_model=AgentStatusResponse)
async def agent_status(call_id: str):
    """Check whether the agent is currently active on a call."""
    task = active_agents.get(call_id)
    active = task is not None and not task.done()
    return AgentStatusResponse(
        call_id=call_id,
        agent_active=active,
        message="Active" if active else "Inactive",
    )


@router.get("/{call_id}/events")
async def call_events(call_id: str):
    """
    Server-Sent Events (SSE) stream — subscribe to live gesture + transcript events.

    The React frontend opens this endpoint with EventSource and receives real-time
    events as the agent detects gestures and produces interpretations.

    Event types:
      - {"type": "gesture", "gesture": "HELLO", "confidence": 0.91}
      - {"type": "transcript", "sentence": "Hello there!", "timestamp": 1234567890.0}
      - {"type": "ping"} — keepalive every 15s

    Usage (frontend):
        const es = new EventSource(`http://localhost:8000/api/calls/${callId}/events`);
        es.onmessage = (e) => {
          const event = JSON.parse(e.data);
          if (event.type === "gesture") { ... }
          if (event.type === "transcript") { ... }
        };
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    if call_id not in event_queues:
        event_queues[call_id] = []
    event_queues[call_id].append(queue)

    logger.info(
        "SSE subscriber connected",
        extra={"call_id": call_id},
    )

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                try:
                    # Wait for the next event, with a keepalive ping every 15s
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield json.dumps(event)
                except asyncio.TimeoutError:
                    # Send keepalive ping so the connection stays open
                    yield json.dumps({"type": "ping"})
        except asyncio.CancelledError:
            pass
        finally:
            # Clean up this subscriber's queue on disconnect
            if call_id in event_queues:
                try:
                    event_queues[call_id].remove(queue)
                except ValueError:
                    pass

            logger.info(
                "SSE subscriber disconnected",
                extra={"call_id": call_id},
            )

    return EventSourceResponse(event_generator())
