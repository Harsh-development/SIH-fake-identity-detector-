"""
OCR service.

Uses Tesseract (via pytesseract) to extract raw text from the uploaded
document image, then applies simple regex heuristics to pull out common
ID-document fields (document number, name, DOB, expiry).

Install deps:
    pip install pytesseract pillow opencv-python-headless numpy
    # Tesseract binary must also be installed on the OS:
    #   Ubuntu/Debian: sudo apt-get install tesseract-ocr
    #   macOS:         brew install tesseract

NOTE: The field-extraction regexes here are generic placeholders. Real ID
documents (passports, national IDs, driving licences) vary a lot by
country/format — for production you'll likely want per-document-type
templates or an ML-based field extractor (e.g. a fine-tuned layout model)
rather than regex matching.
"""

import io
import re
import logging

import numpy as np
from PIL import Image

try:
    import pytesseract
except ImportError:  # pragma: no cover
    pytesseract = None

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

logger = logging.getLogger("trustid.ocr")

DOC_NUMBER_PATTERN = re.compile(r"\b([A-Z]{1,2}\d{6,9})\b")
DOB_PATTERN = re.compile(r"\b(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})\b")
NAME_LINE_PATTERN = re.compile(r"(?:NAME|Name)[:\s]+([A-Za-z\s]{3,40})")


def _load_image(doc_bytes: bytes) -> np.ndarray:
    image = Image.open(io.BytesIO(doc_bytes)).convert("RGB")
    return np.array(image)


def _preprocess(img: np.ndarray) -> np.ndarray:
    """Basic preprocessing to improve OCR accuracy: grayscale + threshold."""
    if cv2 is None:
        return img
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    # Adaptive threshold handles uneven lighting on scanned/photographed IDs better
    # than a single global threshold.
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
    )
    return thresh


def _guess_document_type(filename: str, text: str) -> str:
    text_upper = text.upper()
    if "PASSPORT" in text_upper:
        return "Passport"
    if "DRIVING" in text_upper or "LICENCE" in text_upper or "LICENSE" in text_upper:
        return "Driving Licence"
    if "AADHAAR" in text_upper or "AADHAR" in text_upper:
        return "Aadhaar Card"
    if "PAN" in text_upper:
        return "PAN Card"
    return "Passport / ID"


def extract_text(doc_bytes: bytes, filename: str = "") -> dict:
    """
    Extract raw text and best-effort structured fields from a document image.

    Returns a dict shaped like:
    {
        "raw_text": str,
        "document_type": str,
        "document_number": str | None,
        "name": str | None,
        "date_of_birth": str | None,
        "ocr_confidence": float,   # 0-100
    }
    """
    if pytesseract is None:
        raise RuntimeError(
            "pytesseract is not installed. Run: pip install pytesseract "
            "and install the tesseract-ocr binary on the OS."
        )

    img = _load_image(doc_bytes)
    processed = _preprocess(img)

    raw_text = pytesseract.image_to_string(processed)

    # image_to_data gives per-word confidence; average the non-empty ones
    # for a rough overall confidence score.
    data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
    confidences = [int(c) for c in data.get("conf", []) if str(c).lstrip("-").isdigit() and int(c) >= 0]
    ocr_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

    doc_number_match = DOC_NUMBER_PATTERN.search(raw_text)
    dob_match = DOB_PATTERN.search(raw_text)
    name_match = NAME_LINE_PATTERN.search(raw_text)

    result = {
        "raw_text": raw_text.strip(),
        "document_type": _guess_document_type(filename, raw_text),
        "document_number": doc_number_match.group(1) if doc_number_match else None,
        "name": name_match.group(1).strip() if name_match else None,
        "date_of_birth": dob_match.group(1) if dob_match else None,
        "ocr_confidence": ocr_confidence,
    }

    logger.info("OCR extracted fields: doc_number=%s, confidence=%s",
                result["document_number"], result["ocr_confidence"])

    return result