"""
Face verification service.

Detects a face on the document photo and (if provided) on the live
selfie, then compares them.

Two backends are supported:
  1. `face_recognition` (dlib-based, ArcFace-style embeddings) — used if
     installed. This gives genuinely meaningful similarity scores and is
     what you should use in production.
  2. OpenCV Haar cascade + histogram comparison — automatic fallback if
     `face_recognition`/dlib isn't installed. This ONLY tells you whether
     a face was detected; the "similarity" score from color-histogram
     comparison is a weak proxy and should NOT be trusted for real
     identity matching. It exists so the pipeline runs end-to-end without
     a dlib build, not as a real biometric matcher.

Install deps (recommended, real face matching):
    pip install face_recognition opencv-python-headless numpy pillow
    # face_recognition requires dlib, which needs cmake + a C++ compiler.
    # On some platforms this is the trickiest dependency to install —
    # see https://github.com/ageitgey/face_recognition for OS-specific notes.

Fallback-only deps:
    pip install opencv-python-headless numpy pillow
"""

import io
import logging

import numpy as np
from PIL import Image

try:
    import face_recognition
    _HAS_FACE_RECOGNITION = True
except ImportError:  # pragma: no cover
    face_recognition = None
    _HAS_FACE_RECOGNITION = False

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

logger = logging.getLogger("trustid.face_verification")

MATCH_THRESHOLD = 0.6  # face_recognition distance threshold (lower = stricter)


def _load_rgb(image_bytes: bytes) -> np.ndarray:
    return np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))


def _verify_with_face_recognition(doc_img: np.ndarray, live_img: np.ndarray) -> dict:
    doc_encodings = face_recognition.face_encodings(doc_img)
    if not doc_encodings:
        return {
            "face_detected_on_document": False,
            "face_detected_on_live_photo": None,
            "match": False,
            "similarity_score": 0.0,
            "method": "face_recognition",
            "notes": "No face detected on document image.",
        }

    live_encodings = face_recognition.face_encodings(live_img)
    if not live_encodings:
        return {
            "face_detected_on_document": True,
            "face_detected_on_live_photo": False,
            "match": False,
            "similarity_score": 0.0,
            "method": "face_recognition",
            "notes": "No face detected on live photo.",
        }

    distance = face_recognition.face_distance([doc_encodings[0]], live_encodings[0])[0]
    similarity_score = round(max(0.0, (1 - distance)) * 100, 2)
    match = bool(distance <= MATCH_THRESHOLD)

    return {
        "face_detected_on_document": True,
        "face_detected_on_live_photo": True,
        "match": match,
        "similarity_score": similarity_score,
        "method": "face_recognition",
        "notes": f"face distance={round(float(distance), 4)} (threshold={MATCH_THRESHOLD})",
    }


def _detect_face_opencv(img: np.ndarray):
    if cv2 is None:
        raise RuntimeError("opencv-python is required for the fallback face detector.")
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])  # largest detected face
    return img[y:y + h, x:x + w]


def _verify_with_opencv_fallback(doc_img: np.ndarray, live_img: np.ndarray) -> dict:
    doc_face = _detect_face_opencv(doc_img)
    if doc_face is None:
        return {
            "face_detected_on_document": False,
            "face_detected_on_live_photo": None,
            "match": False,
            "similarity_score": 0.0,
            "method": "opencv_fallback",
            "notes": "No face detected on document image. NOTE: fallback backend, install "
                     "face_recognition for real biometric matching.",
        }

    live_face = _detect_face_opencv(live_img)
    if live_face is None:
        return {
            "face_detected_on_document": True,
            "face_detected_on_live_photo": False,
            "match": False,
            "similarity_score": 0.0,
            "method": "opencv_fallback",
            "notes": "No face detected on live photo. NOTE: fallback backend, install "
                     "face_recognition for real biometric matching.",
        }

    # Weak proxy similarity: compare color histograms of the two detected
    # face crops. This is NOT a real biometric match — two different
    # people with similar lighting/skin tone can score deceptively high.
    doc_resized = cv2.resize(doc_face, (128, 128))
    live_resized = cv2.resize(live_face, (128, 128))
    doc_hist = cv2.calcHist([doc_resized], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    live_hist = cv2.calcHist([live_resized], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    cv2.normalize(doc_hist, doc_hist)
    cv2.normalize(live_hist, live_hist)
    correlation = cv2.compareHist(doc_hist, live_hist, cv2.HISTCMP_CORREL)
    similarity_score = round(max(0.0, correlation) * 100, 2)

    return {
        "face_detected_on_document": True,
        "face_detected_on_live_photo": True,
        "match": similarity_score >= 70.0,  # arbitrary, weak — see notes
        "similarity_score": similarity_score,
        "method": "opencv_fallback",
        "notes": "Fallback backend (histogram comparison) — NOT reliable for real identity "
                 "matching. Install `face_recognition` for production use.",
    }


def verify_face(doc_bytes: bytes, live_photo_bytes: bytes | None) -> dict:
    """
    Detect and compare a face on the document vs. a live photo.

    If no live photo is provided, only face-presence-on-document is checked.
    """
    doc_img = _load_rgb(doc_bytes)

    if live_photo_bytes is None:
        if _HAS_FACE_RECOGNITION:
            has_face = len(face_recognition.face_encodings(doc_img)) > 0
        else:
            has_face = _detect_face_opencv(doc_img) is not None
        return {
            "face_detected_on_document": has_face,
            "face_detected_on_live_photo": None,
            "match": None,
            "similarity_score": None,
            "method": "face_recognition" if _HAS_FACE_RECOGNITION else "opencv_fallback",
            "notes": "No live photo provided — face match skipped, only presence checked.",
        }

    live_img = _load_rgb(live_photo_bytes)

    if _HAS_FACE_RECOGNITION:
        result = _verify_with_face_recognition(doc_img, live_img)
    else:
        logger.warning("face_recognition not installed — using weak OpenCV fallback matcher")
        result = _verify_with_opencv_fallback(doc_img, live_img)

    logger.info("Face verification: match=%s, score=%s, method=%s",
                result["match"], result["similarity_score"], result["method"])
    return result