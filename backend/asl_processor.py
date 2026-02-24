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

import os
from typing import Callable, Optional

import av
from inference_sdk import InferenceHTTPClient
from vision_agents.core.processors import VideoProcessor
from vision_agents.core.utils.video_forwarder import VideoForwarder

from gesture_buffer import GestureBuffer


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
    ):
        """
        Args:
            fps: How many frames per second to send to Roboflow. Keep ≤10
                 to avoid burning free tier API calls.
            confidence_threshold: Min confidence (0–1) to accept a gesture.
                                  Falls back to GESTURE_CONFIDENCE_THRESHOLD env var.
            on_gesture: Callback invoked with (gesture_label, confidence)
                        whenever a new gesture is confidently detected.
                        Used to push events to the SSE stream.
        """
        self.fps = fps
        self.threshold = confidence_threshold or float(
            os.getenv("GESTURE_CONFIDENCE_THRESHOLD", "0.65")
        )
        self.on_gesture = on_gesture
        self.buffer = GestureBuffer()
        self._client: InferenceHTTPClient | None = None
        self._shared_forwarder: Optional[VideoForwarder] = None

    @property
    def name(self) -> str:
        return "asl_gesture_processor"

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
        """
        try:
            arr = _video_frame_to_ndarray(frame)
        except Exception as e:
            print(f"[ASLProcessor] Frame conversion error: {e}")
            return

        try:
            model_id = os.getenv("ROBOFLOW_MODEL_ID", "asl-hand-gesture-recognition/1")
            result = self._get_client().infer(arr, model_id=model_id)
        except Exception as e:
            print(f"[ASLProcessor] Roboflow inference error: {e}")
            return

        predictions = result.get("predictions", [])
        if not predictions:
            return

        top = max(predictions, key=lambda p: p["confidence"])
        if top["confidence"] < self.threshold:
            return

        gesture = top["class"].upper()
        confidence = round(top["confidence"], 3)

        if not self.buffer.add(gesture):
            return

        if self.on_gesture:
            try:
                self.on_gesture(gesture, confidence)
            except Exception as e:
                print(f"[ASLProcessor] on_gesture callback error: {e}")
