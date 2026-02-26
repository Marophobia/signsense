#!/usr/bin/env python3
"""
Test Roboflow ASL model inference on a single image.

Usage:
  From backend directory (with .env present):
    python scripts/test_roboflow_inference.py path/to/image.jpg
    python scripts/test_roboflow_inference.py   # uses default fixture if present

  Requires ROBOFLOW_API_KEY and ROBOFLOW_MODEL_ID in .env (or environment).
  You can use any image path; for ASL, use a photo containing a hand gesture.
  Sample images are available from Roboflow Universe (ASL hand gesture datasets).
"""

import os
import sys
from pathlib import Path

# Run from backend directory so .env and imports work
backend_dir = Path(__file__).resolve().parent.parent
if backend_dir not in sys.path:
    sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

from dotenv import load_dotenv

load_dotenv()

from config import settings
from inference_sdk import InferenceHTTPClient


def main() -> int:
    api_key = settings.ROBOFLOW_API_KEY
    if not api_key:
        print("ROBOFLOW_API_KEY is not set. Set it in .env or the environment.", file=sys.stderr)
        return 1

    model_id = settings.ROBOFLOW_MODEL_ID

    if len(sys.argv) >= 2:
        image_path = Path(sys.argv[1])
    else:
        # Optional default fixture path
        image_path = backend_dir / "tests" / "fixtures" / "sample_asl_frame.jpg"
        if not image_path.exists():
            image_path = backend_dir / "public" / "images" / "a-ASL.jpg"
        if not image_path.exists():
            print(
                "No image path given and no default fixture found.",
                file=sys.stderr,
            )
            print(
                "Usage: python scripts/test_roboflow_inference.py <path/to/image.jpg>",
                file=sys.stderr,
            )
            print(
                "Or add a sample image at backend/tests/fixtures/sample_asl_frame.jpg",
                file=sys.stderr,
            )
            return 1

    if not image_path.is_file():
        print(f"Not a file: {image_path}", file=sys.stderr)
        return 1

    client = InferenceHTTPClient(
        api_url="https://detect.roboflow.com",
        api_key=api_key,
    )

    print(f"Inferring on {image_path} with model_id={model_id} ...")
    try:
        result = client.infer(str(image_path), model_id=model_id)
    except Exception as e:
        print(f"Inference failed: {e}", file=sys.stderr)
        return 1

    predictions = result.get("predictions", [])
    if not predictions:
        print("No predictions returned (empty result).")
        return 0

    print(f"Predictions ({len(predictions)}):")
    for p in predictions:
        cls = p.get("class", "?")
        conf = p.get("confidence", 0)
        print(f"  - {cls!r} (confidence: {conf:.2%})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
