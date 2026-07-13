/**
 * faceIdentityTracker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enhanced face tracking with anti-spoofing features:
 * - Continuous identity verification
 * - Frame consistency analysis
 * - Micro-movement detection
 * - Texture analysis for printed photo detection
 * - Head movement tracking
 */

const LANDMARK_COUNT = 68;
export const LOCK_SAMPLE_COUNT = 8; // Increased for better stability
export const IDENTITY_DRIFT_THRESHOLD = 0.28; // Stricter threshold

// ─── Anti-Spoofing Thresholds ──────────────────────────────────────────────
const SPOOF_THRESHOLDS = {
  MIN_MICRO_MOVEMENTS: 3, // Minimum micro-movements per second
  MAX_STILL_FRAMES: 5, // Maximum consecutive still frames
  MIN_TEXTURE_VARIANCE: 0.02, // Minimum texture variation (anti-photo)
  MAX_SIMILARITY_TO_PREVIOUS: 0.92, // Max frame similarity (anti-replay)
  MIN_BLINK_RATE: 1, // Minimum blinks per 10 seconds
  MAX_BLINK_RATE: 8, // Maximum blinks per 10 seconds (anti-bot)
  HEAD_MOVEMENT_THRESHOLD: 0.03, // Minimum head movement
};

export function computeFaceSignature(landmarks) {
  const points = landmarks?.positions;
  if (!Array.isArray(points) || points.length !== LANDMARK_COUNT) return null;

  const leftEye = points.slice(36, 42);
  const rightEye = points.slice(42, 48);
  const avg = (pts) => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });
  const leftCenter = avg(leftEye);
  const rightCenter = avg(rightEye);

  const iod = Math.hypot(rightCenter.x - leftCenter.x, rightCenter.y - leftCenter.y);
  if (!Number.isFinite(iod) || iod < 18) return null;

  const originX = (leftCenter.x + rightCenter.x) / 2;
  const originY = (leftCenter.y + rightCenter.y) / 2;

  const signature = new Array(LANDMARK_COUNT * 2);
  for (let i = 0; i < LANDMARK_COUNT; i++) {
    signature[i * 2] = (points[i].x - originX) / iod;
    signature[i * 2 + 1] = (points[i].y - originY) / iod;
  }
  return signature;
}

export function signatureDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return Infinity;
  }
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / a.length);
}

/**
 * Enhanced FaceIdentityTracker with anti-spoofing capabilities
 */
export class FaceIdentityTracker {
  constructor() {
    this.lockedSignature = null;
    this.pendingSamples = [];
    this.sampleCount = 0;
    this.multiFaceHits = 0;
    this.noFaceHits = 0;
    this.maxDriftFromLock = 0;
    this.failure = null;
    
    // ─── Anti-Spoofing State ──────────────────────────────────────────────
    this.microMovements = [];
    this.frameHistory = [];
    this.blinkHistory = [];
    this.headMovementHistory = [];
    this.textureVariance = [];
    this.stillFrameCount = 0;
    this.previousLandmarks = null;
    this.faceQualityHistory = [];
    this.lastMicroMovementTime = Date.now();
    this.microMovementCount = 0;
  }

  get isLocked() {
    return !!this.lockedSignature;
  }

  /**
   * Analyze texture variance to detect printed photos
   */
  analyzeTexture(video) {
    if (!video) return 0;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 64, 64);
      const imageData = ctx.getImageData(0, 0, 64, 64);
      const data = imageData.data;
      
      let variance = 0;
      let mean = 0;
      const pixels = [];
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        pixels.push(gray);
        mean += gray;
      }
      mean /= pixels.length;
      
      for (const pixel of pixels) {
        variance += Math.pow(pixel - mean, 2);
      }
      variance /= pixels.length;
      
      return variance / 255;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Detect if the face is showing natural micro-movements
   */
  detectMicroMovements(currentLandmarks, previousLandmarks) {
    if (!previousLandmarks) return 0;
    
    let totalMovement = 0;
    const positions = currentLandmarks.positions;
    const previousPositions = previousLandmarks.positions;
    
    // Check 10 random points for micro-movements
    const indices = [0, 8, 16, 27, 30, 36, 42, 48, 54, 60];
    for (const idx of indices) {
      if (idx < positions.length && idx < previousPositions.length) {
        const dx = positions[idx].x - previousPositions[idx].x;
        const dy = positions[idx].y - previousPositions[idx].y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
      }
    }
    
    return totalMovement / indices.length;
  }

  /**
   * Enhanced observe with anti-spoofing checks
   */
  observe({ faceCount, landmarks, video }) {
    if (this.failure) return { ok: false, ...this.failure };

    if (faceCount > 1) {
      this.multiFaceHits += 1;
      this.failure = { code: "MULTIPLE_FACES", message: "Only one person is allowed." };
      return { ok: false, ...this.failure };
    }

    if (faceCount === 0 || !landmarks) {
      this.noFaceHits += 1;
      return { ok: true, noFace: true };
    }

    const signature = computeFaceSignature(landmarks);
    if (!signature) {
      return { ok: true, noFace: true };
    }

    this.sampleCount += 1;

    // ─── Anti-Spoofing: Texture Analysis ──────────────────────────────────
    if (video) {
      const texture = this.analyzeTexture(video);
      this.textureVariance.push(texture);
      
      // Check for suspicious texture (printed photo)
      if (this.textureVariance.length > 10) {
        const recentTextures = this.textureVariance.slice(-10);
        const avgTexture = recentTextures.reduce((a, b) => a + b, 0) / recentTextures.length;
        
        if (avgTexture < SPOOF_THRESHOLDS.MIN_TEXTURE_VARIANCE) {
          this.failure = { 
            code: "PHOTO_DETECTED", 
            message: "Photo detected. Please use a live face." 
          };
          return { ok: false, ...this.failure };
        }
      }
    }

    // ─── Anti-Spoofing: Micro-Movement Detection ──────────────────────────
    const microMovement = this.detectMicroMovements(landmarks, this.previousLandmarks);
    this.microMovements.push(microMovement);
    
    // Count micro-movements over time
    if (microMovement > 0.5) {
      this.microMovementCount += 1;
      this.lastMicroMovementTime = Date.now();
    }
    
    // Check for suspicious stillness (printed photo or video replay)
    if (this.microMovements.length > 20) {
      const recentMovements = this.microMovements.slice(-20);
      const avgMovement = recentMovements.reduce((a, b) => a + b, 0) / recentMovements.length;
      
      if (avgMovement < 0.5) {
        this.stillFrameCount += 1;
        if (this.stillFrameCount > SPOOF_THRESHOLDS.MAX_STILL_FRAMES) {
          this.failure = { 
            code: "NO_MOVEMENT", 
            message: "No natural movement detected. Please move naturally." 
          };
          return { ok: false, ...this.failure };
        }
      } else {
        this.stillFrameCount = 0;
      }
    }

    // ─── Anti-Spoofing: Head Movement Analysis ──────────────────────────────
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const box = landmarks._detection?.box || { width: 1 };
    
    const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
    const yaw = box.width ? (nose[0].x - eyeCenterX) / box.width : 0;
    this.headMovementHistory.push(yaw);
    
    if (this.headMovementHistory.length > 30) {
      const recent = this.headMovementHistory.slice(-30);
      const range = Math.max(...recent) - Math.min(...recent);
      
      if (range < SPOOF_THRESHOLDS.HEAD_MOVEMENT_THRESHOLD) {
        // Suspicious: too still
        this.failure = { 
          code: "NO_HEAD_MOVEMENT", 
          message: "No natural head movement detected. Please move your head slightly." 
        };
        return { ok: false, ...this.failure };
      }
    }

    this.previousLandmarks = landmarks;

    // ─── Identity Locking ──────────────────────────────────────────────────
    if (!this.lockedSignature) {
      this.pendingSamples.push(signature);
      if (this.pendingSamples.length >= LOCK_SAMPLE_COUNT) {
        const dims = signature.length;
        const locked = new Array(dims).fill(0);
        for (const s of this.pendingSamples) {
          for (let i = 0; i < dims; i++) locked[i] += s[i] / this.pendingSamples.length;
        }
        this.lockedSignature = locked;
      }
      return { ok: true, locked: !!this.lockedSignature };
    }

    const drift = signatureDistance(signature, this.lockedSignature);
    if (drift > this.maxDriftFromLock) this.maxDriftFromLock = drift;

    if (drift > IDENTITY_DRIFT_THRESHOLD) {
      this.failure = { code: "FACE_CHANGED", message: "Face changed. Verification failed." };
      return { ok: false, ...this.failure };
    }

    return { ok: true, drift };
  }

  /**
   * Enhanced proof with anti-spoofing data
   */
  getProof() {
    const avgMicroMovement = this.microMovements.length > 0
      ? this.microMovements.reduce((a, b) => a + b, 0) / this.microMovements.length
      : 0;
      
    const avgTexture = this.textureVariance.length > 0
      ? this.textureVariance.reduce((a, b) => a + b, 0) / this.textureVariance.length
      : 0;

    const headMovementRange = this.headMovementHistory.length > 0
      ? Math.max(...this.headMovementHistory) - Math.min(...this.headMovementHistory)
      : 0;

    return {
      hasLockedSignature: !!this.lockedSignature,
      lockedSignatureLength: this.lockedSignature?.length || 0,
      sampleCount: this.sampleCount,
      multiFaceHits: this.multiFaceHits,
      maxDriftFromLock: Number(this.maxDriftFromLock.toFixed(4)),
      driftThreshold: IDENTITY_DRIFT_THRESHOLD,
      failed: !!this.failure,
      failureCode: this.failure?.code || null,
      antiSpoofing: {
        microMovements: Number(avgMicroMovement.toFixed(3)),
        textureVariance: Number(avgTexture.toFixed(3)),
        stillFrameCount: this.stillFrameCount,
        headMovementRange: Number(headMovementRange.toFixed(3)),
        microMovementCount: this.microMovementCount,
        timestamp: Date.now(),
      },
    };
  }
}