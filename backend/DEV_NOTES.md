## SignSense Backend Dev Notes

### How to run the backend

- **Start FastAPI server** (from `backend/`):
  - `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Health check**:
  - `GET /health` → `{"status": "ok", "service": "SignSense AI"}`

### Roboflow model debugging

- **Required env vars** (set in `.env`):
  - `ROBOFLOW_API_KEY`
  - `ROBOFLOW_MODEL_ID` (e.g. `asl-ustyz/2`)
  - `GESTURE_CONFIDENCE_THRESHOLD` (default `0.65`)

- **Single-image CLI test**:
  - From `backend/`:
    - `python scripts/test_roboflow_inference.py path/to/image.jpg`
  - Output: prints each prediction with class + confidence.

- **HTTP debug endpoint**:
  - `POST /api/debug/classify-image`
  - Content-Type: `multipart/form-data`
  - Field: `file` = image file
  - Response:
    - `{ "model_id": "<id>", "predictions": [...] }`

### Live call flow & events

- **Create a call**:
  - `POST /api/calls/create`
  - Body: `{ "user_id": "<id>", "user_name": "<name>" }`
  - Response: `{ call_id, call_type, token, api_key }`

- **Start the agent**:
  - `POST /api/calls/{call_id}/start-agent`
  - Body: `{ "call_type": "default" }`

- **Subscribe to events (SSE)**:
  - `GET /api/calls/{call_id}/events`
  - Event payloads:
    - Gesture events:
      - `{ "type": "gesture", "gesture": "HELLO", "confidence": 0.91, "timestamp": 1234567890.0 }`
      - Low-confidence / unclear frames:
        - `{ "type": "gesture", "gesture": "[UNCLEAR]", "confidence": 0.42, "timestamp": ... }`
    - Keepalive ping:
      - `{ "type": "ping" }`

### Gesture buffering & thresholds

- **Single source of truth**:
  - `config.settings.GESTURE_CONFIDENCE_THRESHOLD` controls what “high enough confidence” means.
  - `ASLGestureProcessor` uses this threshold to:
    - Drop low-confidence detections from the `GestureBuffer`.
    - Emit `[UNCLEAR]` gesture events for the UI when confidence is below the threshold.

- **GestureBuffer contract**:
  - `GestureBuffer.add(gesture)`:
    - Returns `True` → high-confidence gesture accepted and emitted via SSE.
    - Returns `False` → debounced / ignored; no SSE event.
  - `silence_timeout`:
    - After a pause, the buffer auto-resets and starts a new “sentence” of gestures.

