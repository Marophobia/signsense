"""Pydantic models for API request and response validation."""

from pydantic import BaseModel


# ─── Request Bodies ────────────────────────────────────────────────────────────

class CreateCallRequest(BaseModel):
    """Body for POST /api/calls/create"""
    user_id: str
    user_name: str = "User"


class StartAgentRequest(BaseModel):
    """Body for POST /api/calls/{call_id}/start-agent"""
    call_type: str = "default"


# ─── Response Bodies ───────────────────────────────────────────────────────────

class CreateCallResponse(BaseModel):
    """
    Returned to the frontend after creating a call.
    The frontend uses call_id + token to join via the Stream Video React SDK.
    """
    call_id: str
    call_type: str
    token: str           # Stream user auth token — frontend uses this to join
    api_key: str         # Stream API key — frontend needs this too


class AgentStatusResponse(BaseModel):
    """Status of the Vision Agent for a given call."""
    call_id: str
    agent_active: bool
    message: str


# ─── SSE Event Payloads ────────────────────────────────────────────────────────

class GestureEvent(BaseModel):
    """Emitted via SSE whenever a new gesture is detected by the processor."""
    type: str = "gesture"
    gesture: str         # e.g. "HELLO"
    confidence: float    # e.g. 0.91


class TranscriptEvent(BaseModel):
    """Emitted via SSE whenever the LLM produces an interpreted sentence."""
    type: str = "transcript"
    sentence: str        # e.g. "Hello, my name is John."
    timestamp: float
