/**
 * FaceDetector.jsx
 * ---------------------------------------------------------
 * Reusable, self-contained React component for FACE DETECTION ONLY.
 *
 * Drop this component into any existing React project (e.g. your
 * Identity Document Verification app) to add a face detection step.
 *
 * Props:
 *   - onResult(result): optional callback fired on every detection tick
 *       result = { detected, confidence, faceCount, faces }
 *   - autoStart: boolean, start the camera automatically on mount (default false)
 *
 * Everything runs client-side via face-api.js — no frame is ever
 * uploaded or stored.
 */

import React, { useEffect } from "react";
import useFaceDetector from "../hooks/useFaceDetector";
import "../styles/FaceDetector.css";

export default function FaceDetector({ onResult, autoStart = false }) {
  const {
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    result,
    error,
    isCameraOn,
    isLoading,
  } = useFaceDetector();

  // Bubble up detection results to the parent app, if it wants them
  useEffect(() => {
    if (typeof onResult === "function") {
      onResult(result);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const statusClass = result.detected
    ? "fd-status fd-status-detected"
    : isCameraOn
    ? "fd-status fd-status-not-detected"
    : "fd-status fd-status-idle";

  const statusLabel = !isCameraOn
    ? "Camera Stopped"
    : result.detected
    ? result.faceCount > 1
      ? `Face Detected (${result.faceCount} faces)`
      : "Face Detected"
    : "No Face Detected";

  return (
    <div className="fd-container">
      <h2 className="fd-title">Face Detection Module</h2>

      <div className="fd-video-wrapper">
        <video ref={videoRef} autoPlay muted playsInline className="fd-video" />
        <canvas ref={canvasRef} className="fd-overlay" />
      </div>

      <div className="fd-controls">
        <button
          className="fd-btn fd-btn-start"
          onClick={startCamera}
          disabled={isCameraOn || isLoading}
        >
          {isLoading ? "Loading model..." : "Start Camera"}
        </button>
        <button
          className="fd-btn fd-btn-stop"
          onClick={stopCamera}
          disabled={!isCameraOn}
        >
          Stop Camera
        </button>
      </div>

      <div className="fd-status-panel">
        <div className="fd-status-row">
          <span className="fd-label">Status:</span>
          <span className={statusClass}>{statusLabel}</span>
        </div>
        <div className="fd-status-row">
          <span className="fd-label">Faces Detected:</span>
          <span>{result.faceCount}</span>
        </div>
        <div className="fd-status-row">
          <span className="fd-label">Confidence:</span>
          <span>{Math.round(result.confidence * 100)}%</span>
        </div>

        {error && <div className="fd-error-box">{error}</div>}
      </div>
    </div>
  );
}
