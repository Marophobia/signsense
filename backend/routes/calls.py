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
import os
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException
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

# ─── In-memory state ──────────────────────────────────────────────────────────
# In a real production app, use Redis. For the hackathon, this is fine.

# active_agents: call_id → asyncio.Task
active_agents: dict[str, asyncio.Task] = {}

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


def make_on_gesture_callback(call_id: str):
    """
    Returns a callback that pushes gesture + transcript events into the SSE queues
    for a specific call_id. Passed to run_agent() → ASLGestureProcessor.
    """
    def callback(gesture_or_sentence: str, confidence: float):
        if call_id not in event_queues:
            return
        event = {
            "type": "gesture",
            "gesture": gesture_or_sentence,
            "confidence": confidence,
            "timestamp": time.time(),
        }
        for queue in event_queues[call_id]:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass  # Drop if subscriber is too slow
    return callback


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
    background_tasks: BackgroundTasks,
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
        return AgentStatusResponse(
            call_id=call_id,
            agent_active=True,
            message="Agent is already active on this call.",
        )

    # Set up SSE event queue for this call
    if call_id not in event_queues:
        event_queues[call_id] = []

    on_gesture = make_on_gesture_callback(call_id)

    # Launch agent as background asyncio task
    loop = asyncio.get_event_loop()
    task = loop.create_task(
        run_agent(
            call_id=call_id,
            call_type=body.call_type,
            on_transcript=on_gesture,
        )
    )
    active_agents[call_id] = task

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

    task = active_agents.pop(call_id)
    if not task.done():
        task.cancel()

    # Clean up event queues
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

    return EventSourceResponse(event_generator())
