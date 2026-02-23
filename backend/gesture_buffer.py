"""
Gesture Buffer
==============
Manages the stream of detected ASL gestures:
  - Deduplicates rapid same-gesture repetition (debounce)
  - Maintains a rolling window of recent unique gestures
  - Groups gestures into sentence-level chunks for the LLM
  - Resets after a pause (configurable silence timeout)

ASL grammar note:
  ASL does not map 1:1 to English. Signs like HAPPY-ME (topic-comment structure)
  become "I am happy" in English. The LLM handles this conversion, but the buffer
  helps by grouping signs into meaningful chunks before sending.
"""

import time
from collections import deque


class GestureBuffer:
    """
    Thread-safe rolling buffer for deduplicated ASL gesture labels.

    Usage:
        buffer = GestureBuffer(max_size=30, silence_timeout=2.0)

        # On each frame with a detection:
        if buffer.add("HELLO"):
            # New gesture accepted — send context to LLM
            sentence_hint = buffer.get_sentence_hint()
    """

    def __init__(
        self,
        max_size: int = 30,
        silence_timeout: float = 2.0,
        debounce_seconds: float = 0.4,
    ):
        """
        Args:
            max_size: Max number of gestures to keep in memory.
            silence_timeout: Seconds of no new gesture before the buffer
                             is considered a "complete sentence" and resets.
            debounce_seconds: Minimum seconds between adding the SAME gesture again.
                              Prevents one held sign from flooding the buffer.
        """
        self._buffer: deque[dict] = deque(maxlen=max_size)
        self._last_gesture: str | None = None
        self._last_gesture_time: float = 0.0
        self._last_add_time: float = time.monotonic()
        self.silence_timeout = silence_timeout
        self.debounce_seconds = debounce_seconds

    def add(self, gesture: str) -> bool:
        """
        Attempt to add a gesture to the buffer.

        Returns True if accepted (new gesture or debounce elapsed).
        Returns False if it's a duplicate within the debounce window.
        """
        now = time.monotonic()

        # Auto-reset if silence timeout exceeded (sentence boundary)
        if now - self._last_add_time > self.silence_timeout and self._buffer:
            self._reset()

        # Debounce: ignore the same gesture within the window
        if (
            gesture == self._last_gesture
            and now - self._last_gesture_time < self.debounce_seconds
        ):
            return False

        self._buffer.append({"gesture": gesture, "timestamp": now})
        self._last_gesture = gesture
        self._last_gesture_time = now
        self._last_add_time = now
        return True

    def get_recent(self, n: int = 10) -> list[str]:
        """Return the last n gesture labels as a list."""
        items = list(self._buffer)[-n:]
        return [item["gesture"] for item in items]

    def get_sentence_hint(self) -> str:
        """
        Return a space-separated string of current buffer gestures.
        This is injected into the LLM prompt as the "sign sequence to interpret."

        Example: "HELLO MY NAME JOHN HAPPY MEET YOU"
        """
        return " ".join(self.get_recent(n=20))

    def clear(self):
        """Manually clear the buffer (e.g., after LLM responds)."""
        self._reset()

    def __len__(self) -> int:
        return len(self._buffer)

    def _reset(self):
        self._buffer.clear()
        self._last_gesture = None
        self._last_gesture_time = 0.0
