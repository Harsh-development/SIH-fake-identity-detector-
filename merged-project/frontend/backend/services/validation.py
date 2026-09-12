"""
Validation service.

Checks the fields extracted by OCR for completeness, format correctness,
and internal consistency (e.g. DOB is a real, plausible date). This is a
rules-based sanity check — it does NOT verify the document against any
external database/registry. Add a lookup integration (e.g. government ID
verification API) if you need authoritative validation.
"""

import logging
from datetime import datetime

logger = logging.getLogger("trustid.validation")

REQUIRED_FIELDS = ["document_number", "name", "date_of_birth"]
MIN_OCR_CONFIDENCE = 60.0  # below this, OCR is considered unreliable


def _parse_date(date_str: str):
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def validate_document(ocr_data: dict) -> dict:
    """
    Validate OCR output.

    Returns:
    {
        "is_valid": bool,
        "issues": [str, ...],
        "checks": {
            "fields_present": bool,
            "ocr_confidence_ok": bool,
            "dob_plausible": bool,
        }
    }
    """
    issues = []

    # 1. Required fields present
    missing = [f for f in REQUIRED_FIELDS if not ocr_data.get(f)]
    fields_present = len(missing) == 0
    if missing:
        issues.append(f"Missing fields: {', '.join(missing)}")

    # 2. OCR confidence threshold
    confidence = ocr_data.get("ocr_confidence", 0.0)
    ocr_confidence_ok = confidence >= MIN_OCR_CONFIDENCE
    if not ocr_confidence_ok:
        issues.append(f"Low OCR confidence ({confidence}%), extracted fields may be unreliable")

    # 3. DOB plausibility (real date, not in the future, not absurdly old)
    dob_plausible = False
    dob_raw = ocr_data.get("date_of_birth")
    if dob_raw:
        parsed = _parse_date(dob_raw)
        if parsed is None:
            issues.append(f"Date of birth '{dob_raw}' could not be parsed")
        else:
            now = datetime.now()
            age_years = (now - parsed).days / 365.25
            if parsed > now:
                issues.append("Date of birth is in the future")
            elif age_years > 120:
                issues.append("Date of birth implies an implausible age")
            else:
                dob_plausible = True
    else:
        issues.append("Date of birth not found")

    is_valid = fields_present and ocr_confidence_ok and dob_plausible

    result = {
        "is_valid": is_valid,
        "issues": issues,
        "checks": {
            "fields_present": fields_present,
            "ocr_confidence_ok": ocr_confidence_ok,
            "dob_plausible": dob_plausible,
        },
    }

    logger.info("Validation result: is_valid=%s, issues=%s", is_valid, issues)
    return result