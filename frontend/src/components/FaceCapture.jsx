import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Camera, RefreshCw } from "lucide-react";
import { FaceIdentityTracker, computeFaceSignature } from "../utils/faceIdentityTracker.js";

const MODEL_URL = "/models";
const FACE_API_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

// Average an array of 128-d face-api.js descriptors (Float32Array) into one plain array.
function averageDescriptors(descriptors) {
  if (!descriptors.length) return null;
  const dims = descriptors[0].length;
  const merged = new Array(dims).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < dims; i += 1) merged[i] += d[i] / descriptors.length;
  }
  return merged;
}

export default function FaceCapture({ onCapture, captureCount = 1, captureInterval = 250 }) {
  const webcamRef = useRef(null);
  const timerRef = useRef([]);
  const trackerRef = useRef(new FaceIdentityTracker());
  const [status, setStatus] = useState("initializing");
  const [progress, setProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [alertMsg, setAlertMsg] = useState({ type: "info", text: "Preparing camera feed…" });
  const [modelsReady, setModelsReady] = useState(false);

  const resetFlow = useCallback(() => {
    trackerRef.current = new FaceIdentityTracker();
    setCapturedImage(null);
    setCapturedImages([]);
    setStatus("initializing");
    setProgress(0);
    setAlertMsg({ type: "info", text: "Preparing camera feed…" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        if (!cancelled) {
          setModelsReady(false);
          setAlertMsg({ type: "error", text: "Face detection models failed to load. Anti-spoof proof will be unavailable." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    resetFlow();
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [
      setTimeout(() => { setStatus("detecting"); setProgress(30); setAlertMsg({ type: "info", text: "Detecting facial landmarks…" }); }, 800),
      setTimeout(() => { setStatus("detected");  setProgress(65); setAlertMsg({ type: "success", text: "Face detected successfully." }); }, 1800),
      setTimeout(() => { setStatus("ready");     setProgress(100); setAlertMsg({ type: "success", text: "Ready — click Capture Face." }); }, 2600),
    ];
    return () => timerRef.current.forEach(clearTimeout);
  }, [resetFlow]);

  const capture = useCallback(async () => {
    if (!webcamRef.current) {
      setAlertMsg({ type: "error", text: "Camera not available." });
      return;
    }

    const buildProof = async () => {
      if (!modelsReady || !webcamRef.current?.video) return null;
      return trackerRef.current?.getProof?.() ?? null;
    };

    const signatures = [];
    const buildSignature = () => {
      if (!signatures.length) return null;
      const merged = new Array(signatures[0].length).fill(0);
      for (const sig of signatures) {
        for (let i = 0; i < merged.length; i += 1) {
          merged[i] += sig[i] / signatures.length;
        }
      }
      return merged;
    };

    if (captureCount === 1) {
      const img = webcamRef.current.getScreenshot();
      if (!img) {
        setAlertMsg({ type: "error", text: "Capture failed. Try again." });
        return;
      }

      setCapturedImages([img]);
      setCapturedImage(img);
      setStatus("captured");
      const proof = await buildProof();
      if (proof?.failed) {
        setAlertMsg({ type: "error", text: `Anti-spoofing concern detected: ${proof.failureCode || "please retry"}` });
      } else {
        setAlertMsg({ type: "success", text: "Face captured. Retake if needed." });
      }

      let descriptor = null;
      if (modelsReady && webcamRef.current?.video) {
        try {
          const detection = await faceapi
            .detectSingleFace(webcamRef.current.video, FACE_API_OPTIONS)
            .withFaceLandmarks(true)
            .withFaceDescriptor();
          if (detection?.descriptor) descriptor = Array.from(detection.descriptor);
        } catch (err) {
          console.warn("Face descriptor extraction failed:", err);
        }
      }
      if (!descriptor) {
        setAlertMsg({ type: "error", text: "Could not read a face descriptor. Please retake in good lighting." });
      }

      onCapture?.([img], proof, null, descriptor);
      return;
    }

    const frames = [];
    const descriptors = [];
    let captured = 0;
    const MAX_STORED_FRAMES = 6; // cap payload size; analysis still runs on every tracked frame
    const storeEvery = Math.max(1, Math.floor(captureCount / MAX_STORED_FRAMES));

    setStatus("capturing");
    setProgress(0);
    setAlertMsg({ type: "info", text: `Capturing ${captureCount} live frames…` });

    const captureFrame = async () => {
      const shouldStore = captured % storeEvery === 0 || captured === captureCount - 1;
      const img = shouldStore ? webcamRef.current?.getScreenshot() : null;
      if (img) frames.push(img);

      if (modelsReady && webcamRef.current?.video) {
        try {
          const detections = await faceapi
            .detectAllFaces(webcamRef.current.video, FACE_API_OPTIONS)
            .withFaceLandmarks(true)
            .withFaceDescriptors();
          const faceCount = detections?.length || 0;
          const landmarks = detections?.[0]?.landmarks ?? null;
          const result = trackerRef.current.observe({ faceCount, landmarks, video: webcamRef.current.video });
          if (!result.ok) {
            setAlertMsg({ type: "error", text: result.message || "Anti-spoofing check raised a concern." });
          }
          if (landmarks) {
            const signature = computeFaceSignature(landmarks);
            if (signature) {
              signatures.push(signature);
            }
          }
          if (detections?.[0]?.descriptor) {
            descriptors.push(Array.from(detections[0].descriptor));
          }
        } catch (err) {
          console.warn("Face detection failed during capture:", err);
        }
      }

      captured += 1;
      setProgress(Math.min(100, Math.round((captured / captureCount) * 100)));

      if (captured < captureCount) {
        const timeout = setTimeout(captureFrame, captureInterval);
        timerRef.current.push(timeout);
      } else {
        if (!frames.length) {
          setStatus("ready");
          setAlertMsg({ type: "error", text: "Capture failed. Try again." });
          setProgress(0);
          return;
        }

        setCapturedImages(frames);
        setCapturedImage(frames[0]);
        setStatus("captured");
        const proof = await buildProof();
        const descriptor = averageDescriptors(descriptors);
        if (proof?.failed) {
          setAlertMsg({ type: "error", text: `Anti-spoofing concern detected: ${proof.failureCode || "please retry"}` });
        } else if (!descriptor) {
          setAlertMsg({ type: "error", text: "Could not read a face descriptor. Please retake in good lighting." });
        } else {
          setAlertMsg({ type: "success", text: `Captured ${frames.length} frames.` });
        }
        const signature = buildSignature();
        onCapture?.(frames, proof, signature, descriptor);
      }
    };

    captureFrame();
  }, [captureCount, captureInterval, modelsReady, onCapture]);

  const alertColors = {
    info:    { bg: "rgba(6,182,212,0.08)",  border: "rgba(6,182,212,0.2)",   text: "#22d3ee" },
    success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",  text: "#34d399" },
    error:   { bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.2)",   text: "#fb7185" },
  };
  const ac = alertColors[alertMsg.type];

  return (
    <div className="space-y-4">
      {/* Camera box */}
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(99,102,241,0.3)", aspectRatio: "4/3", maxWidth: 400 }}>
        {!capturedImage ? (
          <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <img src={capturedImage} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {/* Scan overlay */}
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, pointerEvents: "none" }}>
          <div className="scan-line" />
          {/* Corners */}
          {[["top:12px","left:12px","border-top:2px solid #6366f1","border-left:2px solid #6366f1","border-radius:6px 0 0 0"],
            ["top:12px","right:12px","border-top:2px solid #6366f1","border-right:2px solid #6366f1","border-radius:0 6px 0 0"],
            ["bottom:12px","left:12px","border-bottom:2px solid #6366f1","border-left:2px solid #6366f1","border-radius:0 0 0 6px"],
            ["bottom:12px","right:12px","border-bottom:2px solid #6366f1","border-right:2px solid #6366f1","border-radius:0 0 6px 0"]].map((c, i) => (
            <div key={i} style={{ position: "absolute", width: 22, height: 22, ...Object.fromEntries(c.map(s => s.split(":"))) }} />
          ))}
        </div>
        {/* Status badge */}
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "5px 14px", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", color: status === "ready" || status === "captured" ? "#34d399" : status === "detecting" ? "#fbbf24" : "#94a3b8" }}>
          {status === "initializing" ? "Initializing…" : status === "detecting" ? "Detecting face…" : status === "detected" ? "Face found" : status === "ready" ? "✓ Ready to capture" : "✓ Captured"}
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%`, background: progress === 100 ? "#10b981" : "linear-gradient(90deg,#6366f1,#818cf8)" }} />
      </div>

      {/* Alert */}
      <div style={{ background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: ac.text }}>
        {alertMsg.text}
      </div>

      {/* Button */}
      <button type="button" onClick={capturedImage ? resetFlow : capture}
        className={`btn w-full ${capturedImage ? "btn-ghost" : "btn-primary"}`}
        disabled={status === "initializing" || status === "detecting" || status === "capturing"}>
        {capturedImage
          ? <><RefreshCw size={14} /> Retake Capture</>
          : <><Camera size={14} /> Capture Face{captureCount > 1 ? ` (${captureCount} frames)` : ""}</>}
      </button>
      {capturedImages.length > 1 && (
        <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
          {capturedImages.length} frames captured for better verification.
        </div>
      )}
    </div>
  );
}
