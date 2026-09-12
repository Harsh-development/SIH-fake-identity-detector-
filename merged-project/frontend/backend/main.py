import sys
import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

# ============================================================
# PYTHON PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ============================================================
# SERVICES
# ============================================================

from services.ocr import extract_text
from services.validation import validate_document
from services.tampering import detect_tampering
from services.risk_score import calculate_risk
from services.face_verification import verify_face


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:%(name)s:%(message)s"
)

logger = logging.getLogger("trustid")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="TRUSTID AI",
    description="AI Powered Fake Identity & Government Document Screening System",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================
#
# These are the normal local Vite/React development URLs.
#
# IMPORTANT:
# Do NOT use:
#
# allow_origins=["*"]
# allow_credentials=True
#
# together.
#
# ============================================================

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # In case your React app uses port 3000
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ============================================================
# FILE CONFIGURATION
# ============================================================

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_DOCUMENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

ALLOWED_FACE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ============================================================
# FILE READER + VALIDATION
# ============================================================

async def _read_and_validate_upload(
    file: UploadFile,
    field_name: str,
    allowed_types: set[str],
) -> bytes:

    if file is None:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name}: file is required"
        )

    # --------------------------------------------------------
    # Content type
    # --------------------------------------------------------

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{field_name}: unsupported content type "
                f"'{file.content_type}'. "
                f"Allowed types: {', '.join(sorted(allowed_types))}"
            )
        )

    # --------------------------------------------------------
    # Read file
    # --------------------------------------------------------

    try:
        data = await file.read()
    except Exception as exc:
        logger.exception(
            "Failed to read uploaded file: %s",
            field_name
        )

        raise HTTPException(
            status_code=400,
            detail=f"{field_name}: unable to read file"
        ) from exc

    # --------------------------------------------------------
    # Empty file
    # --------------------------------------------------------

    if not data:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name}: empty file"
        )

    # --------------------------------------------------------
    # File size
    # --------------------------------------------------------

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{field_name}: file exceeds "
                f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB limit"
            )
        )

    return data


# ============================================================
# SAFE VALUE HELPERS
# ============================================================

def safe_dict(value):
    """
    Makes sure a service result is always a dictionary.
    Prevents .get() crashes when a service returns None.
    """

    if isinstance(value, dict):
        return value

    return {
        "status": "unknown",
        "result": value
    }


def normalize_percentage(value):
    """
    Converts common face-score formats into 0-100 percentage.

    Examples:
        0.95 -> 95
        95   -> 95
    """

    if value is None:
        return None

    try:
        value = float(value)
    except (TypeError, ValueError):
        return None

    if 0 <= value <= 1:
        value *= 100

    return max(0, min(100, value))


def extract_face_score(face_result):
    """
    Finds the face score regardless of the exact field name
    returned by the face verification service.
    """

    if not isinstance(face_result, dict):
        return None

    possible_keys = [
        "score",
        "similarity",
        "similarity_score",
        "confidence",
        "match_score",
        "match_percentage",
        "face_score",
        "face_match_score",
    ]

    for key in possible_keys:
        if key in face_result:
            score = normalize_percentage(face_result.get(key))

            if score is not None:
                return round(score, 2)

    return None


def get_face_status(face_result):
    """
    Finds the face verification status.
    """

    if not isinstance(face_result, dict):
        return "UNKNOWN"

    possible_keys = [
        "status",
        "match_status",
        "recommendation",
        "result",
    ]

    for key in possible_keys:
        value = face_result.get(key)

        if value is not None:
            return str(value)

    # Some implementations return a boolean match field.
    if "match" in face_result:
        return "MATCH" if face_result["match"] else "NO MATCH"

    if "matched" in face_result:
        return "MATCH" if face_result["matched"] else "NO MATCH"

    return "UNKNOWN"


def get_match_level(score):
    """
    Converts face score into HIGH / MEDIUM / LOW.

    You can adjust these thresholds later depending on
    your actual face recognition model.
    """

    if score is None:
        return "UNKNOWN"

    if score >= 80:
        return "HIGH"

    if score >= 50:
        return "MEDIUM"

    return "LOW"


# ============================================================
# MAIN DOCUMENT VERIFICATION API
# ============================================================

@app.post("/api/verify-document")
async def verify_document_endpoint(
    document: UploadFile = File(...),
    live_photo: UploadFile = File(None),
):

    request_id = uuid.uuid4().hex[:8]

    logger.info(
        "[%s] verify-document request received",
        request_id
    )

    # ========================================================
    # 1. VALIDATE DOCUMENT
    # ========================================================

    doc_bytes = await _read_and_validate_upload(
        document,
        "document",
        ALLOWED_DOCUMENT_TYPES
    )

    # ========================================================
    # 2. VALIDATE FACE PHOTO
    # ========================================================

    live_photo_bytes = None

    if live_photo is not None:

        live_photo_bytes = await _read_and_validate_upload(
            live_photo,
            "live_photo",
            ALLOWED_FACE_TYPES
        )

    # ========================================================
    # 3. OCR
    # ========================================================

    try:

        logger.info(
            "[%s] Starting OCR",
            request_id
        )

        ocr_result = await run_in_threadpool(
            extract_text,
            doc_bytes,
            document.filename
        )

        ocr_result = safe_dict(ocr_result)

        logger.info(
            "[%s] OCR completed",
            request_id
        )

    except Exception as exc:

        logger.exception(
            "[%s] OCR stage failed",
            request_id
        )

        raise HTTPException(
            status_code=502,
            detail="OCR processing failed"
        ) from exc

    # ========================================================
    # 4. DOCUMENT VALIDATION
    # ========================================================

    try:

        logger.info(
            "[%s] Starting document validation",
            request_id
        )

        validation_result = await run_in_threadpool(
            validate_document,
            ocr_result
        )

        validation_result = safe_dict(
            validation_result
        )

        logger.info(
            "[%s] Document validation completed",
            request_id
        )

    except Exception as exc:

        logger.exception(
            "[%s] Validation stage failed",
            request_id
        )

        raise HTTPException(
            status_code=502,
            detail="Document validation failed"
        ) from exc

    # ========================================================
    # 5. TAMPERING DETECTION
    # ========================================================

    try:

        logger.info(
            "[%s] Starting tampering detection",
            request_id
        )

        tamper_result = await run_in_threadpool(
            detect_tampering,
            doc_bytes
        )

        tamper_result = safe_dict(
            tamper_result
        )

        logger.info(
            "[%s] Tampering detection completed",
            request_id
        )

    except Exception as exc:

        logger.exception(
            "[%s] Tampering detection failed",
            request_id
        )

        raise HTTPException(
            status_code=502,
            detail="Tampering detection failed"
        ) from exc

    # ========================================================
    # 6. FACE VERIFICATION
    # ========================================================

    try:

        logger.info(
            "[%s] Starting face verification",
            request_id
        )

        face_result = await run_in_threadpool(
            verify_face,
            doc_bytes,
            live_photo_bytes
        )

        face_result = safe_dict(
            face_result
        )

        logger.info(
            "[%s] Face verification completed",
            request_id
        )

    except Exception as exc:

        logger.exception(
            "[%s] Face verification failed",
            request_id
        )

        raise HTTPException(
            status_code=502,
            detail="Face verification failed"
        ) from exc

    # ========================================================
    # 7. FACE SCORE
    # ========================================================

    face_score = extract_face_score(
        face_result
    )

    face_status = get_face_status(
        face_result
    )

    face_match_level = get_match_level(
        face_score
    )

    # ========================================================
    # 8. RISK SCORE
    # ========================================================

    try:

        logger.info(
            "[%s] Calculating risk",
            request_id
        )

        risk_summary = await run_in_threadpool(
            calculate_risk,
            ocr_data=ocr_result,
            validation_data=validation_result,
            tamper_data=tamper_result,
            face_data=face_result
        )

        risk_summary = safe_dict(
            risk_summary
        )

        logger.info(
            "[%s] Risk calculation completed",
            request_id
        )

    except Exception as exc:

        logger.exception(
            "[%s] Risk scoring failed",
            request_id
        )

        raise HTTPException(
            status_code=502,
            detail="Risk scoring failed"
        ) from exc

    # ========================================================
    # 9. RISK SCORE
    # ========================================================

    raw_risk_score = risk_summary.get(
        "score",
        0
    )

    try:
        risk_score = float(raw_risk_score)
    except (TypeError, ValueError):
        risk_score = 0

    risk_score = max(
        0,
        min(100, risk_score)
    )

    risk_score = round(
        risk_score,
        2
    )

    recommendation = risk_summary.get(
        "recommendation",
        "Awaiting officer decision"
    )

    # ========================================================
    # 10. DOCUMENT INFORMATION
    # ========================================================

    document_number = ocr_result.get(
        "document_number"
    )

    if not document_number:
        document_number = (
            f"DOC-{uuid.uuid4().hex[:5].upper()}"
        )

    document_type = ocr_result.get(
        "document_type",
        "Government ID"
    )

    # ========================================================
    # 11. DOCUMENT MATCH COUNT
    # ========================================================
    #
    # This is useful for the frontend.
    #
    # Currently one uploaded document is analyzed.
    # If later you add multiple documents, this field can
    # be increased by the multi-document pipeline.
    #
    # ========================================================

    document_matched = bool(
        validation_result.get("is_valid", False)
    )

    document_match_count = 1 if document_matched else 0

    # ========================================================
    # 12. FINAL RESULT
    # ========================================================

    final_result = {
        "requestId": request_id,

        "docId": document_number,

        "docType": document_type,

        "submittedAt": "Just now",

        "officer": "Officer System",

        "thumbnailLabel": document.filename,

        "status": recommendation,

        "riskScore": risk_score,

        # ----------------------------------------------------
        # Per-dimension contribution to the overall risk score,
        # as computed by services/risk_score.py. Used by the
        # frontend's Risk Distribution panel.
        # ----------------------------------------------------

        "riskBreakdown": risk_summary.get("breakdown", {}),

        # ----------------------------------------------------
        # Face analysis for frontend graph
        # ----------------------------------------------------

        "faceMatch": {
            "score": face_score,
            "percentage": face_score,
            "status": face_status,
            "level": face_match_level,
        },

        # ----------------------------------------------------
        # Document matching
        # ----------------------------------------------------

        "documentMatch": {
            "matched": document_matched,
            "count": document_match_count,
        },

        # ----------------------------------------------------
        # Complete modules
        # ----------------------------------------------------

        "modules": {

            "ocr": ocr_result,

            "validation": validation_result,

            "tampering": tamper_result,

            "face_verification": face_result,

        },

        # ----------------------------------------------------
        # Summary for frontend
        # ----------------------------------------------------

        "summary": {

            "ocrCompleted": True,

            "validationCompleted": True,

            "tamperingAnalysisCompleted": True,

            "faceVerificationCompleted": True,

            "faceMatchScore": face_score,

            "faceMatchLevel": face_match_level,

            "documentMatched": document_matched,

            "documentsMatched": document_match_count,

            "riskScore": risk_score,

            "recommendation": recommendation,

        },
    }

    # ========================================================
    # LOG FINAL RESULT
    # ========================================================

    logger.info(
        "[%s] Verification completed | "
        "risk=%s | face=%s | level=%s",
        request_id,
        risk_score,
        face_score,
        face_match_level
    )

    return final_result


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "TRUSTID AI",
        "version": "1.0.0",
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "service": "TRUSTID AI",
        "status": "running",
        "message": "Government document verification API is running.",
        "endpoints": {
            "health": "/health",
            "verify_document": "/api/verify-document",
        },
    }
