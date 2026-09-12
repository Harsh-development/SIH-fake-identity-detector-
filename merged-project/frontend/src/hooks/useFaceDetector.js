/**
 * useFaceDetector
 * ---------------------------------------------------------
 * React hook that wraps FaceDetectorEngine and exposes a simple,
 * idiomatic React API. This is the PRIMARY piece you import when
 * integrating face detection into another React project/component.
 *
 * Usage:
 *   const {
 *     videoRef, canvasRef,
 *     startCamera, stopCamera,
 *     detectFace, result, error, isCameraOn, isLoading,
 *   } = useFaceDetector();
 *
 *   <video ref={videoRef} autoPlay muted playsInline />
 *   <canvas ref={canvasRef} />
 *
 * `result` updates continuously (every detection tick) while the
 * camera is running:
 *   { detected: boolean, confidence: number, faceCount: number, faces: [...] }
 */

import { useRef, useState, useCallback, useEffect } from "react";
import FaceDetectorEngine from "../FaceDetectorEngine";

export default function useFaceDetector(options = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState({
    detected: false,
    confidence: 0,
    faceCount: 0,
    faces: [],
  });

  // Create the engine instance once
  if (!engineRef.current) {
    engineRef.current = new FaceDetectorEngine(options);
  }

  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await engineRef.current.init(videoRef.current, canvasRef.current);
      engineRef.current.onResult(setResult);
      await engineRef.current.startCamera();
      setIsCameraOn(true);
    } catch (err) {
      setError(err.message);
      setIsCameraOn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    engineRef.current.stopCamera();
    setIsCameraOn(false);
    setResult({ detected: false, confidence: 0, faceCount: 0, faces: [] });
  }, []);

  const detectFace = useCallback(async () => {
    return engineRef.current.detectFace();
  }, []);

  // Safety net: release camera hardware if component unmounts while running
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stopCamera();
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    detectFace,
    result,
    error,
    isCameraOn,
    isLoading,
  };
}
