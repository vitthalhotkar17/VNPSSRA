import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { ScanFace, Eye, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../services/api.js";

/**
 * LivenessCheck
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time liveness detection using face-api.js (68-point face landmarks,
 * the same landmark model family MediaPipe Face Landmarker uses).
 *
 * Flow:
 *  1. Load tiny face detector + tiny 68-point landmark model from /models.
 *  2. Ask the backend for a random challenge: "blink" | "turn_left" | "turn_right".
 *  3. Track the face ~7x/second:
 *       - Eye Aspect Ratio (EAR) for blink detection.
 *       - Nose-tip horizontal offset (normalised by face box width) for head-turn detection.
 *  4. Record a short neutral "baseline" window, then watch for the requested
 *     action within a time limit.
 *  5. On success, report { challengeId, action, metrics } to the parent so it
 *     can be sent to the backend alongside the matching face capture — the
 *     backend independently re-checks these numbers before trusting them.
 *
 * A printed photo or a photo replayed on another screen has no eyelids that
 * close and reopen and no 3-D structure that changes the nose-to-eye
 * geometry when turned — so it cannot satisfy either challenge, which is
 * what rejects spoofed attendance attempts.
 */

const MODEL_URL = "/models";
const BASELINE_MS = 900; // time to sample a "neutral" reading before watching for the action
const CHALLENGE_TIMEOUT_MS = 12000; // time allowed to complete the action
const DETECT_INTERVAL_MS = 140;

const ACTION_COPY = {
  blink: { label: "Blink your eyes", icon: Eye, hint: "Blink naturally when the camera is tracking your face." },
  turn_left: { label: "Turn your head to the LEFT", icon: ScanFace, hint: "Slowly turn toward the left side of the screen, then back." },
  turn_right: { label: "Turn your head to the RIGHT", icon: ScanFace, hint: "Slowly turn toward the right side of the screen, then back." },
};

function dist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Standard 6-point Eye Aspect Ratio (EAR).
function eyeAspectRatio(eye) {
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return 0.3;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export default function LivenessCheck({ onSuccess, onCancel }) {
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const stateRef = useRef({
    phase: "loading", // loading | baseline | watching | success | failed
    baselineEAR: [],
    baselineYaw: [],
    minEAR: 1,
    maxYawDelta: 0,
    blinkDetected: false,
    turnDetected: false,
    samples: 0,
    startedAt: 0,
  });

  const [modelsReady, setModelsReady] = useState(false);
  const [challenge, setChallenge] = useState(null); // { challengeId, action }
  const [phase, setPhase] = useState("loading"); // loading | baseline | watching | success | failed
  const [message, setMessage] = useState("Loading liveness models…");
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [noFace, setNoFace] = useState(false);

  // ── Load face-api.js models once ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        if (!cancelled) {
          setPhase("failed");
          setMessage("Could not load liveness models. Check your connection and retry.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch a random challenge from the backend once models are ready ─────
  const fetchChallenge = useCallback(async () => {
    try {
      setPhase("loading");
      setMessage("Requesting liveness challenge…");
      const { data } = await api.get("/faces/liveness-challenge");
      const c = data.data; // { challengeId, action, expiresAt }
      setChallenge(c);

      stateRef.current = {
        phase: "baseline",
        baselineEAR: [],
        baselineYaw: [],
        minEAR: 1,
        maxYawDelta: 0,
        blinkDetected: false,
        turnDetected: false,
        samples: 0,
        startedAt: Date.now(),
      };
      setPhase("baseline");
      setMessage("Hold still, look at the camera…");
    } catch (err) {
      setPhase("failed");
      setMessage(err?.response?.data?.message || "Could not start liveness check. Please retry.");
    }
  }, []);

  useEffect(() => {
    if (modelsReady) fetchChallenge();
  }, [modelsReady, fetchChallenge]);

  // ── Detection loop ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "baseline" && phase !== "watching") return undefined;

    const tick = async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true); // true = tiny landmark model

      const s = stateRef.current;

      if (!detection) {
        setNoFace(true);
        return;
      }
      setNoFace(false);

      const landmarks = detection.landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      const box = detection.detection.box;

      const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
      const noseTip = nose[Math.floor(nose.length / 2)] || nose[0];
      const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
      const yaw = box.width ? (noseTip.x - eyeCenterX) / box.width : 0;

      s.samples += 1;

      if (s.phase === "baseline") {
        s.baselineEAR.push(ear);
        s.baselineYaw.push(yaw);
        if (Date.now() - s.startedAt >= BASELINE_MS) {
          s.baselineEARAvg = s.baselineEAR.reduce((a, b) => a + b, 0) / s.baselineEAR.length;
          s.baselineYawAvg = s.baselineYaw.reduce((a, b) => a + b, 0) / s.baselineYaw.length;
          s.minEAR = s.baselineEARAvg;
          s.phase = "watching";
          s.watchStartedAt = Date.now();
          setPhase("watching");
          const copy = ACTION_COPY[challenge?.action];
          setMessage(copy ? copy.label + " now…" : "Perform the requested action…");
        }
        return;
      }

      // phase === "watching"
      s.minEAR = Math.min(s.minEAR, ear);
      if (s.baselineEARAvg - ear > 0.08 && ear < 0.23) {
        s.blinkDetected = true;
      }

      const yawDelta = yaw - (s.baselineYawAvg || 0);
      if (Math.abs(yawDelta) > Math.abs(s.maxYawDelta)) s.maxYawDelta = yawDelta;
      if (Math.abs(yawDelta) > 0.09) s.turnDetected = true;

      const action = challenge?.action;
      const satisfied =
        (action === "blink" && s.blinkDetected) ||
        (action === "turn_left" && s.turnDetected && s.maxYawDelta < 0) ||
        (action === "turn_right" && s.turnDetected && s.maxYawDelta > 0);

      if (satisfied) {
        s.phase = "success";
        setPhase("success");
        setMessage("Liveness confirmed!");
        const metrics = {
          samples: s.samples,
          baselineEAR: s.baselineEARAvg,
          minEAR: s.minEAR,
          blinkDetected: s.blinkDetected,
          baselineYaw: s.baselineYawAvg,
          maxYawDelta: s.maxYawDelta,
          turnDetected: s.turnDetected,
          durationMs: Date.now() - s.startedAt,
        };
        onSuccess?.({ challengeId: challenge.challengeId, action, metrics });
      }
    };

    intervalRef.current = setInterval(tick, DETECT_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, challenge, onSuccess]);

  // ── Overall timeout / countdown ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "baseline" && phase !== "watching") return undefined;
    const start = stateRef.current.startedAt || Date.now();

    const countdown = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((CHALLENGE_TIMEOUT_MS - (Date.now() - start)) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(countdown);
        setPhase("failed");
        setMessage("Time's up — no live action detected. Please retry.");
      }
    }, 250);

    return () => clearInterval(countdown);
  }, [phase, challenge]);

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  const retry = () => {
    setNoFace(false);
    setSecondsLeft(null);
    fetchChallenge();
  };

  const ActionIcon = challenge ? ACTION_COPY[challenge.action]?.icon || ScanFace : ScanFace;

  return (
    <div className="space-y-4">
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", border: "1px solid rgba(99,102,241,0.3)", aspectRatio: "4/3", maxWidth: 400 }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, pointerEvents: "none" }} />

        {phase === "watching" && challenge && (
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "8px 16px" }}>
            <ActionIcon size={16} color="#818cf8" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap" }}>{ACTION_COPY[challenge.action]?.label}</span>
          </div>
        )}

        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "5px 14px", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", color: phase === "success" ? "#34d399" : phase === "failed" ? "#fb7185" : "#94a3b8" }}>
          {message}{secondsLeft != null && phase !== "success" && phase !== "failed" ? ` · ${secondsLeft}s` : ""}
        </div>
      </div>

      {noFace && (phase === "baseline" || phase === "watching") && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#fbbf24" }}>
          <AlertTriangle size={14} /> No face detected — center your face in the frame.
        </div>
      )}

      {challenge && phase === "watching" && (
        <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--muted)" }}>
          {ACTION_COPY[challenge.action]?.hint}
        </div>
      )}

      {phase === "success" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#34d399" }}>
          <CheckCircle2 size={14} /> Live person confirmed. Proceeding to face capture…
        </div>
      )}

      {phase === "failed" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#fb7185" }}>
            <AlertTriangle size={14} /> {message}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>← Back</button>}
            <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={retry}>
              <RotateCcw size={14} /> Retry Liveness Check
            </button>
          </div>
        </>
      )}
    </div>
  );
}
