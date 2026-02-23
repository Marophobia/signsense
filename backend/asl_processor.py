"""
ASL Gesture Processor
=====================
A custom Vision Agents VideoProcessor that:
  1. Receives raw video frames from the Stream WebRTC pipeline
  2. Sends each frame to the Roboflow ASL model for inference
  3. Deduplicates rapid repeated gestures (debounce)
  4. Buffers gestures and forwards them to the LLM for sentence construction
  5. Calls on_gesture() callback so FastAPI can push events via SSE

Roboflow model setup:
  - Sign up at roboflow.com
  - Search Roboflow Universe for "ASL hand gesture" (aim for >80% mAP)
  - Set ROBOFLOW_API_KEY and ROBOFLOW_MODEL_ID in .env

Tuning tips:
  - Lower GESTURE_CONFIDENCE_THRESHOLD if too many gestures are missed
  - Raise it if you get too many false positives
  - FPS 10 is a good balance between accuracy and API costs
"""

import base64
import os
import time
from typing import Callable

from inference_sdk import InferenceHTTPClient

from gesture_buffer import GestureBuffer


class ASLGestureProcessor:
    """
    Custom VideoProcessor for real-time ASL hand gesture recognition.

    This does NOT subclass VideoProcessor directly — it follows the
    Vision Agents processor duck-typing protocol. Subclass or adjust
    if the SDK version you're on requires explicit inheritance.
    """

    def __init__(
        self,
        fps: int = 10,
        confidence_threshold: float | None = None,
        on_gesture: Callable[[str, float], None] | None = None,
    ):
        """
        Args:
            fps: How many frames per second to send to Roboflow. Keep ≤10
                 to avoid burning free tier API calls.
            confidence_threshold: Min confidence (0–1) to accept a gesture.
                                  Falls back to GESTURE_CONFIDENCE_THRESHOLD env var.
            on_gesture: Callback invoked with (sentence_or_label, confidence)
                        whenever a new gesture is confidently detected.
                        Used to push events to the SSE stream.
        """
        self.fps = fps
        self.threshold = confidence_threshold or float(
            os.getenv("GESTURE_CONFIDENCE_THRESHOLD", "0.65")
        )
        self.on_gesture = on_gesture
        self.buffer = GestureBuffer()
        self._last_frame_time = 0.0

        # Roboflow client — lazy initialised on first frame to avoid
        # crashing at import time if keys aren't set yet.
        self._client: InferenceHTTPClient | None = None

    def _get_client(self) -> InferenceHTTPClient:
        if self._client is None:
            api_key = os.getenv("ROBOFLOW_API_KEY")
            if not api_key:
                raise EnvironmentError(
                    "ROBOFLOW_API_KEY is not set. Check your .env file."
                )
            self._client = InferenceHTTPClient(
                api_url="https://detect.roboflow.com",
                api_key=api_key,
            )
        return self._client

    async def process(self, frame, **kwargs) -> dict | None:
        """
        Called by Vision Agents for every incoming video frame.

        Args:
            frame: Raw video frame (numpy array or base64 bytes — SDK provides this).
            **kwargs: Extra context from Vision Agents (ignored here).

        Returns:
            dict with gesture info if a new gesture was detected, else None.
            The returned dict is passed to the LLM as additional context.
        """
        # ── Rate limit: only process at our target FPS ──────────────────────
        now = time.monotonic()
        if now - self._last_frame_time < 1.0 / self.fps:
            return None
        self._last_frame_time = now

        # ── Run Roboflow inference ────────────────────────────────────────────
        try:
            model_id = os.getenv("ROBOFLOW_MODEL_ID", "asl-hand-gesture-recognition/1")
            result = self._get_client().infer(frame, model_id=model_id)
        except Exception as e:
            print(f"[ASLProcessor] Roboflow inference error: {e}")
            return None

        predictions = result.get("predictions", [])
        if not predictions:
            return None

        # ── Pick highest-confidence prediction ───────────────────────────────
        top = max(predictions, key=lambda p: p["confidence"])

        if top["confidence"] < self.threshold:
            return None  # Not confident enough — skip

        gesture = top["class"].upper()
        confidence = round(top["confidence"], 3)

        # ── Debounce: ignore rapid repetition of the same gesture ────────────
        if not self.buffer.add(gesture):
            return None  # Same gesture still held — skip duplicate

        # ── Build context to inject into LLM prompt ──────────────────────────
        context = {
            "gesture": gesture,
            "confidence": confidence,
            "buffer": self.buffer.get_recent(n=10),  # last N unique gestures
            "llm_hint": (
                f"The user just signed [{gesture}] (confidence: {confidence:.0%}). "
                f"Recent signs: {self.buffer.get_sentence_hint()}. "
                f"Interpret this as part of a natural sentence and speak it aloud."
            ),
        }

        # ── Notify FastAPI SSE stream (if callback set) ───────────────────────
        if self.on_gesture:
            try:
                self.on_gesture(gesture, confidence)
            except Exception as e:
                print(f"[ASLProcessor] on_gesture callback error: {e}")

        return context
