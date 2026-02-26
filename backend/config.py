"""
App configuration loaded from environment variables.
All values are read from .env via python-dotenv (loaded in main.py).
"""

import os


class Settings:
    # Stream
    STREAM_API_KEY: str = os.getenv("STREAM_API_KEY", "")
    STREAM_API_SECRET: str = os.getenv("STREAM_API_SECRET", "")

    # LLM / Voice
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # Roboflow
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_MODEL_ID: str = os.getenv("ROBOFLOW_MODEL_ID", "asl-hand-gesture-recognition/1")

    # App
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    GESTURE_CONFIDENCE_THRESHOLD: float = float(
        os.getenv("GESTURE_CONFIDENCE_THRESHOLD", "0.65")
    )

    def validate(self) -> list[str]:
        """Returns list of missing required env vars."""
        required = [
            "STREAM_API_KEY",
            "STREAM_API_SECRET",
            "GOOGLE_API_KEY",
            "ROBOFLOW_API_KEY",
            "ELEVENLABS_API_KEY",
        ]
        return [k for k in required if not getattr(self, k)]


settings = Settings()
