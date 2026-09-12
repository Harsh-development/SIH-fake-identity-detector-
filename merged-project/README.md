# NETRA — TrustID AI + Face Detection (Merged Project)

This is the merged version of two projects:
1. **TrustID AI** — Document Verification System (React + Vite frontend + FastAPI backend)
2. **Face Detection Module** — Real-time webcam face detection using face-api.js

---

## Project Structure

```
merged-project/
├── frontend/               ← React + Vite app (Tailwind CSS)
│   ├── src/
│   │   ├── App.jsx         ← Main app (Dashboard + Face Detection tabs)
│   │   ├── FaceDetectorEngine.js  ← face-api.js engine (no React deps)
│   │   ├── components/
│   │   │   ├── FaceDetector.jsx   ← Live camera face detection UI
│   │   │   └── ...               ← All TrustID dashboard panels
│   │   ├── hooks/
│   │   │   └── useFaceDetector.js ← React hook for face detection
│   │   └── styles/
│   │       └── FaceDetector.css
│   ├── backend/            ← FastAPI Python backend
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── services/
│   │       ├── ocr.py
│   │       ├── face_verification.py
│   │       ├── tampering.py
│   │       ├── validation.py
│   │       └── risk_score.py
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

---

## How to Run

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

- **Dashboard tab** → Document verification panels (mock data)
- **Face Detection tab** → Live webcam face detection

### Backend (FastAPI)

```bash
cd frontend/backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at http://localhost:8000

---

## What Was Merged

| Feature | Source |
|---|---|
| Verification Dashboard UI | Netra_AIML_2006 (TrustID AI) |
| FastAPI backend pipeline | Netra_AIML_2006 (TrustID AI) |
| Live face detection (webcam) | files__2_ (Face Detection Module) |
| FaceDetectorEngine.js | files__2_ |
| useFaceDetector hook | files__2_ |
| "Face Detection" tab in Topbar | NEW (integration) |

