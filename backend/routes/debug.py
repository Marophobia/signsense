"""
Debug Router — /api/debug
=========================
Lightweight HTTP utilities for manually testing the Roboflow ASL model
without going through a live Stream call.

Endpoints:
  - POST /api/debug/classify-image
      Accepts a multipart image file and returns the raw Roboflow
      `predictions` list as JSON for quick inspection.
"""

import logging
import tempfile
from typing import Any, Dict

from fastapi import APIRouter, File, HTTPException, UploadFile
from inference_sdk import InferenceHTTPClient

from config import settings


logger = logging.getLogger(__name__)
router = APIRouter()


def _get_client() -> InferenceHTTPClient:
    """Return a Roboflow HTTP client configured from environment settings."""
    if not settings.ROBOFLOW_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ROBOFLOW_API_KEY is not configured on the backend.",
        )

    return InferenceHTTPClient(
        api_url="https://detect.roboflow.com",
        api_key=settings.ROBOFLOW_API_KEY,
    )


@router.post("/classify-image")
async def classify_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Run a single-image classification against the configured Roboflow ASL model.

    Request:
      Content-Type: multipart/form-data
      Body fields:
        - file: image/* (jpg, png, etc.)

    Response:
      {
        "model_id": "<model_id>",
        "predictions": [ ... ]  # passthrough from Roboflow
      }
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image (content-type image/*).",
        )

    client = _get_client()

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        # The Roboflow SDK accepts file paths; write to a temporary file.
        with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
            tmp.write(contents)
            tmp.flush()
            result = client.infer(tmp.name, model_id=settings.ROBOFLOW_MODEL_ID)
    except HTTPException:
        # Propagate FastAPI HTTP errors directly.
        raise
    except Exception as e:
        logger.exception("Roboflow debug classify-image failed", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail="Roboflow inference failed. Check backend logs for details.",
        )

    predictions = result.get("predictions", [])
    logger.info(
        "Debug classify-image completed",
        extra={
            "model_id": settings.ROBOFLOW_MODEL_ID,
            "prediction_count": len(predictions),
        },
    )

    return {
        "model_id": settings.ROBOFLOW_MODEL_ID,
        "predictions": predictions,
    }

