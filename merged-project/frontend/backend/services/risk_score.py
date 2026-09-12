"""
Risk scoring service.

Combines OCR / validation / tampering / face-verification outputs into a
single 0-100 risk score and a human-readable recommendation for the
reviewing officer.

Weights below are a starting point, not a calibrated model. In production
you'd want to tune these against labeled outcome data (confirmed genuine
vs. confirmed fraudulent submissions) rather than hand-picked constants.
"""

import logging

logger = logging.getLogger("trustid.risk_score")

# Weights sum to 1.0 across the three scored dimensions
WEIGHT_VALIDATION = 0.30
WEIGHT_TAMPERING = 0.40
WEIGHT_FACE_MATCH = 0.30

REJECT_THRESHOLD = 70
REVIEW_THRESHOLD = 35


def _validation_risk(validation_data: dict) -> float:
    """0 = no risk, 100 = max risk, based on validation issues."""
    if validation_data.get("is_valid"):
        return 0.0
    issue_count = len(validation_data.get("issues", []))
    return min(100.0, issue_count * 25.0)


def _tampering_risk(tamper_data: dict) -> float:
    """Tamper score is already 0-100 risk, pass through directly."""
    return float(tamper_data.get("tamper_score", 0.0))


def _face_match_risk(face_data: dict) -> float:
    """
    0 = confirmed match, 100 = confirmed mismatch.
    If no live photo was submitted (match is None), treat as neutral/unknown
    risk rather than penalizing — that's a product decision, adjust if you
    want "no live photo" to itself be a risk signal.
    """
    match = face_data.get("match")
    similarity = face_data.get("similarity_score")

    if match is None or similarity is None:
        return 20.0  # mild uncertainty penalty for not having a live-photo check

    return round(max(0.0, 100.0 - similarity), 2)


def calculate_risk(ocr_data: dict, validation_data: dict, tamper_data: dict, face_data: dict) -> dict:
    """
    Returns:
    {
        "score": int,              # 0-100, higher = riskier
        "recommendation": str,     # "Approve" | "Manual Review" | "Reject"
        "breakdown": {
            "validation_risk": float,
            "tampering_risk": float,
            "face_match_risk": float,
        }
    }
    """
    validation_risk = _validation_risk(validation_data)
    tampering_risk = _tampering_risk(tamper_data)
    face_match_risk = _face_match_risk(face_data)

    weighted_score = (
        validation_risk * WEIGHT_VALIDATION
        + tampering_risk * WEIGHT_TAMPERING
        + face_match_risk * WEIGHT_FACE_MATCH
    )
    score = round(min(100.0, weighted_score))

    if score >= REJECT_THRESHOLD:
        recommendation = "Reject"
    elif score >= REVIEW_THRESHOLD:
        recommendation = "Manual Review"
    else:
        recommendation = "Approve"

    result = {
        "score": score,
        "recommendation": recommendation,
        "breakdown": {
            "validation_risk": round(validation_risk, 2),
            "tampering_risk": round(tampering_risk, 2),
            "face_match_risk": round(face_match_risk, 2),
        },
    }

    logger.info("Risk score computed: %s (%s)", score, recommendation)
    return result