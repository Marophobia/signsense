"""
SignSense AI — FastAPI Backend
==============================
Control plane for the Vision Agent. Handles:
  - Stream auth token generation for the frontend
  - Agent lifecycle (start/stop)
  - SSE stream for live transcript + gesture events to frontend
"""

from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from config import settings
from routes.calls import router as calls_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("🤟 SignSense AI backend starting up...")
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
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(calls_router, prefix="/api/calls", tags=["calls"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SignSense AI"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
