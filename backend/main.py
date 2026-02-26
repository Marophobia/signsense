"""
SignSense AI — FastAPI Backend (Agent Entrypoint)
=================================================
This module is the single backend entrypoint. It runs the FastAPI control plane which:
  - Generates Stream auth tokens for the frontend (POST /api/calls/create)
  - Starts/stops the Vision Agent per call (POST /api/calls/{id}/start-agent, DELETE .../stop-agent)
  - Streams live gesture and transcript events via SSE (GET /api/calls/{id}/events)

The Vision Agent itself is defined in agent.py and launched from routes/calls.py when
the frontend calls start-agent. To run the backend: `python main.py` or
`uvicorn main:app --host 0.0.0.0 --port 8000`.
"""

from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from config import settings
from routes.calls import router as calls_router
from routes.debug import router as debug_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("🤟 SignSense AI backend starting up...")
    missing = settings.validate()
    if missing:
        print(
            f"⚠️  Missing env vars (agent may fail at runtime): {', '.join(missing)}. "
            "Set them in .env (see .env.example)."
        )
    yield
    print("SignSense AI backend shutting down.")


app = FastAPI(
    title="SignSense AI",
    description="Real-time ASL interpreter powered by Vision Agents SDK",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Allow the React frontend to talk to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(calls_router, prefix="/api/calls", tags=["calls"])
app.include_router(debug_router, prefix="/api/debug", tags=["debug"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SignSense AI"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
