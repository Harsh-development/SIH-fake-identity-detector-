"""
Tampering detection service.

Uses Error Level Analysis (ELA): re-compress the image at a known JPEG
quality and diff it against the original. Regions that were digitally
edited after the original compression tend to show a different error
level than untouched regions, showing up as bright patches in the ELA
diff.

IMPORTANT: This is a classic, well-known heuristic — it catches naive
edits (copy-paste, text overlay on a screenshot, re-saved crops) but it
is NOT a robust forgery detector. It can miss sophisticated edits and can
false-positive on images that were legitimately re-compressed/re-saved
multiple times (e.g. WhatsApp-forwarded photos). For production-grade
tamper detection, plug in a trained model (e.g. a CNN trained on
CASIA/Columbia forgery datasets) here instead.

Install deps:
    pip install pillow numpy opencv-python-headless
"""

import io
import logging

import numpy as np
from PIL import Image, ImageChops

logger = logging.getLogger("trustid.tampering")

ELA_QUALITY = 90
# Suspicion thresholds — tuned loosely, expect to calibrate against your
# own dataset of genuine vs. tampered samples.
HIGH_RISK_THRESHOLD = 35.0
MEDIUM_RISK_THRESHOLD = 18.0


def _error_level_analysis(doc_bytes: bytes) -> np.ndarray:
    original = Image.open(io.BytesIO(doc_bytes)).convert("RGB")

    buffer = io.BytesIO()
    original.save(buffer, "JPEG", quality=ELA_QUALITY)
    buffer.seek(0)
    recompressed = Image.open(buffer)

    diff = ImageChops.difference(original, recompressed)
    return np.array(diff, dtype=np.float32)


def detect_tampering(doc_bytes: bytes) -> dict:
    """
    Run ELA-based tamper heuristic on the document image.

    Returns:
    {
        "tamper_score": float,       # 0-100, higher = more suspicious
        "risk_level": "low" | "medium" | "high",
        "method": "error_level_analysis",
        "notes": str,
    }
    """
    try:
        diff = _error_level_analysis(doc_bytes)
    except Exception as e:
        logger.exception("ELA failed")
        raise RuntimeError(f"Tamper analysis could not process image: {e}")

    # Mean intensity of the diff, normalized to 0-100. Real-world ELA
    # analysis usually also looks at localized hotspots, not just the
    # global mean — this is a simplified single-number heuristic.
    mean_diff = float(np.mean(diff))
    max_diff = float(np.max(diff))
    tamper_score = round(min(100.0, (mean_diff / 30.0) * 100), 2)

    if tamper_score >= HIGH_RISK_THRESHOLD:
        risk_level = "high"
    elif tamper_score >= MEDIUM_RISK_THRESHOLD:
        risk_level = "medium"
    else:
        risk_level = "low"

    result = {
        "tamper_score": tamper_score,
        "risk_level": risk_level,
        "method": "error_level_analysis",
        "notes": (
            f"mean_error={round(mean_diff, 2)}, max_error={round(max_diff, 2)}. "
            "ELA is a heuristic, not a definitive forgery proof — treat as a signal "
            "to route for manual review, not an automatic reject."
        ),
    }

    logger.info("Tampering check: score=%s, risk=%s", tamper_score, risk_level)
    return result