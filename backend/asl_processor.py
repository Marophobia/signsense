"""
ASL Gesture Processor
=====================
A Vision Agents VideoProcessor that:
  1. Receives the live video track via process_video(track, participant_id, shared_forwarder)
  2. Registers a frame handler on the shared_forwarder at the configured FPS
  3. Sends each frame to the Roboflow ASL model for inference
  4. Deduplicates rapid repeated gestures (debounce) via GestureBuffer
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

import logging
import os
from typing import Callable, Optional

import av
from inference_sdk import InferenceHTTPClient
from vision_agents.core.processors import VideoProcessor
from vision_agents.core.utils.video_forwarder import VideoForwarder

from config import settings
from gesture_buffer import GestureBuffer


logger = logging.getLogger(__name__)


def _video_frame_to_ndarray(frame: av.VideoFrame):
    """Convert av.VideoFrame to RGB numpy array for Roboflow infer()."""
    if frame.format.name != "rgb24":
        frame = frame.reformat(format="rgb24")
    return frame.to_ndarray()


class ASLGestureProcessor(VideoProcessor):
    """
    VideoProcessor for real-time ASL hand gesture recognition.

    Subclasses Vision Agents VideoProcessor; the SDK calls process_video()
    when a video track is added and stop_processing() when tracks are removed.
    """

    def __init__(
        self,
        fps: int = 10,
        confidence_threshold: float | None = None,
        on_gesture: Callable[[str, float], None] | None = None,
        call_id: str | None = None,
    ):
        """
        Args:
            fps: How many frames per second to send to Roboflow. Keep ≤10
                 to avoid burning free tier API calls.
            confidence_threshold: Min confidence (0–1) to accept a gesture.
                                  Falls back to settings.GESTURE_CONFIDENCE_THRESHOLD.
            on_gesture: Callback invoked with (gesture_label, confidence)
                        whenever a new gesture is confidently detected.
                        Used to push events to the SSE stream.
            call_id: Optional Stream call ID, used only for logging/observability.
        """
        self.fps = fps
        # Single source of truth for gesture threshold: config.settings
        self.threshold = (
            confidence_threshold
            if confidence_threshold is not None
            else settings.GESTURE_CONFIDENCE_THRESHOLD
        )
        self.on_gesture = on_gesture
        self.buffer = GestureBuffer()
        self.call_id = call_id
        self._client: InferenceHTTPClient | None = None
        self._shared_forwarder: Optional[VideoForwarder] = None

    @property
    def name(self) -> str:
        return "asl_gesture_processor"

    def _get_client(self) -> InferenceHTTPClient:
        if self._client is None:
            api_key = settings.ROBOFLOW_API_KEY
            if not api_key:
                raise EnvironmentError(
                    "ROBOFLOW_API_KEY is not set. Check your .env file."
                )
            self._client = InferenceHTTPClient(
                api_url="https://detect.roboflow.com",
                api_key=api_key,
            )
        return self._client

    async def process_video(
        self,
        track,
        participant_id: Optional[str],
        shared_forwarder: Optional[VideoForwarder] = None,
    ) -> None:
        """
        Start processing the video track. Called by the Agent when a new track is published.
        Registers a frame handler on shared_forwarder so we receive frames at self.fps.
        """
        if shared_forwarder is None:
            return
        # If we were already processing another track, stop it first.
        await self.stop_processing()
        self._shared_forwarder = shared_forwarder
        shared_forwarder.add_frame_handler(
            self._on_frame,
            fps=self.fps,
            name="asl_roboflow",
        )

    async def stop_processing(self) -> None:
        """Remove our frame handler from the forwarder. Called when video tracks are removed."""
        if self._shared_forwarder is not None:
            await self._shared_forwarder.remove_frame_handler(self._on_frame)
            self._shared_forwarder = None

    async def close(self) -> None:
        """Clean up when the application exits."""
        await self.stop_processing()

    def _on_frame(self, frame: av.VideoFrame) -> None:
        """
        Called by VideoForwarder at ~self.fps. Run Roboflow inference (sync, may block),
        update buffer, and invoke on_gesture callback when a new gesture is detected.

        Contract:
          - Only when GestureBuffer.add(gesture) returns True do we emit a high-confidence
            gesture event via on_gesture.
          - Gestures below the configured confidence threshold are not added to the buffer.
            Instead, a special "[UNCLEAR]" event may be emitted so the UI can react.
        """
        try:
            arr = _video_frame_to_ndarray(frame)
        except Exception as e:
            logger.exception("Frame conversion error in ASLGestureProcessor", exc_info=e)
            return

        try:
            # Use a single, centralized model ID from config.settings
            model_id = settings.ROBOFLOW_MODEL_ID
            result = self._get_client().infer(arr, model_id=model_id)
        except Exception as e:
            logger.exception(
                "Roboflow inference error in ASLGestureProcessor",
                exc_info=e,
            )
            return

        predictions = result.get("predictions", [])
        if not predictions:
            logger.debug(
                "No Roboflow predictions for frame",
                extra={"call_id": self.call_id},
            )
            return

        top = max(predictions, key=lambda p: p["confidence"])
        raw_conf = float(top.get("confidence", 0.0) or 0.0)
        confidence = round(raw_conf, 3)
        gesture = str(top.get("class", "")).upper() or "[UNKNOWN]"

        # Low-confidence behavior: do NOT add to buffer, optionally emit "[UNCLEAR]" so
        # the frontend can show a gentle notice and avoid sending it to the LLM.
        if raw_conf < self.threshold:
            logger.info(
                "Gesture below confidence threshold; treating as unclear",
                extra={
                    "call_id": self.call_id,
                    "gesture": gesture,
                    "confidence": confidence,
                    "threshold": self.threshold,
                },
            )
            if self.on_gesture:
                try:
                    self.on_gesture("[UNCLEAR]", confidence)
                except Exception as e:
                    logger.exception(
                        "on_gesture callback error for [UNCLEAR] event",
                        exc_info=e,
                    )
            return

        # High-confidence gesture: use GestureBuffer as the single gatekeeper
        accepted = self.buffer.add(gesture)
        if not accepted:
            logger.debug(
                "Gesture rejected by buffer (debounced or within silence window)",
                extra={
                    "call_id": self.call_id,
                    "gesture": gesture,
                    "confidence": confidence,
                },
            )
            return

        logger.info(
            "Gesture accepted by buffer",
            extra={
                "call_id": self.call_id,
                "gesture": gesture,
                "confidence": confidence,
            },
        )

        if self.on_gesture:
            try:
                self.on_gesture(gesture, confidence)
            except Exception as e:
                logger.exception(
                    "on_gesture callback error for gesture event",
                    exc_info=e,
                )
