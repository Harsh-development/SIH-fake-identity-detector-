/**
 * FaceDetectorEngine
 * ---------------------------------------------------------
 * Framework-agnostic core logic for face detection using face-api.js.
 * This class has NO React dependency — it only needs a <video> and
 * <canvas> DOM element. The React hook (useFaceDetector.js) wraps this
 * class to expose it idiomatically to React components.
 *
 * Kept separate from React on purpose: this makes it trivial to reuse
 * in a non-React part of your Identity Document Verification project
 * later, if ever needed (plain JS, Vue, Angular, etc.).
 *
 * Scope: FACE DETECTION ONLY.
 *   - detects presence of face(s)
 *   - draws bounding boxes
 *   - reports confidence + face count
 * Explicitly NOT in scope: recognition, identity matching, storage,
 * upload, backend calls.
 *
 * DetectionResult shape:
 *   {
 *     detected: boolean,
 *     confidence: number,   // 0..1, highest confidence face found
 *     faceCount: number,
 *     faces: [ { confidence, box: {x,y,width,height} }, ... ]
 *   }
 */

import * as faceapi from "face-api.js";

export default class FaceDetectorEngine {
  constructor(options = {}) {
    this.config = {
      inputSize: 224,
      scoreThreshold: 0.5,
      detectionIntervalMs: 150,
      modelUrl: "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights",
      ...options,
    };

    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.mediaStream = null;
    this.modelLoaded = false;
    this.detectionInterval = null;
    this.resultCallback = null;
  }

  /** Load TinyFaceDetector model weights (lightweight, real-time friendly). */
  async loadModel() {
    if (this.modelLoaded) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri(this.config.modelUrl);
    this.modelLoaded = true;
  }

  /**
   * Attach the engine to actual DOM elements.
   * Must be called once video/canvas refs are mounted.
   */
  async init(videoEl, canvasEl) {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext("2d");
    await this.loadModel();
  }

  /** Subscribe to continuous detection results emitted by the detection loop. */
  onResult(callback) {
    this.resultCallback = callback;
  }

  /** Request camera permission and begin streaming + detecting. */
  async startCamera() {
    if (!this.videoElement) {
      throw new Error("FaceDetectorEngine not initialized. Call init() first.");
    }
    if (!this.modelLoaded) {
      await this.loadModel();
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API not supported in this browser.");
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Camera permission denied by the user.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No camera device found on this system.");
      } else if (err.name === "NotReadableError") {
        throw new Error("Camera is already in use by another application.");
      }
      throw new Error("Unable to access camera: " + err.message);
    }

    this.videoElement.srcObject = this.mediaStream;

    await new Promise((resolve) => {
      this.videoElement.onloadedmetadata = () => resolve();
    });

    this.resizeCanvasToVideo();
    this.startDetectionLoop();
  }

  /** Stop camera stream + detection loop. No frames are ever stored. */
  stopCamera() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    if (this.canvasCtx && this.canvasElement) {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  /** Keep overlay canvas pixel-perfect aligned with the displayed video size. */
  resizeCanvasToVideo() {
    this.canvasElement.width = this.videoElement.clientWidth;
    this.canvasElement.height = this.videoElement.clientHeight;
  }

  /** Run a single detection pass on the current video frame. */
  async detectFace() {
    if (!this.modelLoaded || !this.videoElement || this.videoElement.readyState < 2) {
      return { detected: false, confidence: 0, faceCount: 0, faces: [] };
    }

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: this.config.inputSize,
      scoreThreshold: this.config.scoreThreshold,
    });

    const detections = await faceapi.detectAllFaces(this.videoElement, detectorOptions);

    const displaySize = {
      width: this.canvasElement.width,
      height: this.canvasElement.height,
    };
    const resized = faceapi.resizeResults(detections, displaySize);

    const faces = resized.map((d) => ({
      confidence: Number(d.score.toFixed(2)),
      box: {
        x: Math.round(d.box.x),
        y: Math.round(d.box.y),
        width: Math.round(d.box.width),
        height: Math.round(d.box.height),
      },
    }));

    const result = {
      detected: faces.length > 0,
      confidence: faces.length > 0 ? Math.max(...faces.map((f) => f.confidence)) : 0,
      faceCount: faces.length,
      faces,
    };

    this.drawBoundingBoxes(faces);
    return result;
  }

  /** Draw bounding boxes + per-face confidence labels on the overlay canvas. */
  drawBoundingBoxes(faces) {
    const ctx = this.canvasCtx;
    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    faces.forEach((face, index) => {
      const { x, y, width, height } = face.box;

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      const label = `Face ${index + 1} (${Math.round(face.confidence * 100)}%)`;
      ctx.font = "14px Segoe UI, Arial, sans-serif";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
      ctx.fillRect(x, y > 18 ? y - 18 : y, textWidth + 8, 18);

      ctx.fillStyle = "#052e16";
      ctx.fillText(label, x + 4, y > 18 ? y - 5 : y + 13);
    });
  }

  /** Start the continuous real-time detection loop. */
  startDetectionLoop() {
    if (this.detectionInterval) clearInterval(this.detectionInterval);
    this.detectionInterval = setInterval(async () => {
      const result = await this.detectFace();
      if (typeof this.resultCallback === "function") {
        this.resultCallback(result);
      }
    }, this.config.detectionIntervalMs);
  }

  isModelLoaded() {
    return this.modelLoaded;
  }
}
