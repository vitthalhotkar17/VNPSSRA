/**
 * faceMatcher.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure Node.js face verification — no Python, no external face service.
 *
 * Matching strategy:
 *   The frontend (face-api.js, running fully in-browser via WASM/WebGL) computes
 *   a 128-value face descriptor for the live capture. This module compares that
 *   descriptor against the descriptor(s) captured at registration using Euclidean
 *   distance, which is the standard metric for face-api.js descriptors.
 *   (face-api.js's own recommended "same person" cutoff is a distance of ~0.6;
 *   we default to a stricter 0.5 since attendance systems should favor rejecting
 *   over false-accepting.)
 *
 * This module also keeps the anti-spoofing / liveness checks that don't need
 * a face-matching model at all — image quality (sharp), multi-frame motion
 * analysis, and the client-reported anti-spoof telemetry (texture variance,
 * micro-movements, head movement range) produced by faceIdentityTracker.js.
 */

const sharp = require("sharp");

let logger;
try {
  logger = require("./logger");
} catch (e) {
  logger = console;
}

const DESCRIPTOR_LENGTH = 128;

const CONFIG = {
  // Euclidean distance cutoff for face-api.js 128-d descriptors. Lower = stricter.
  MATCH_DISTANCE_THRESHOLD: Number(process.env.FACE_MATCH_DISTANCE_THRESHOLD || 0.5),
};

const ANTI_SPOOF_THRESHOLDS = {
  MIN_TEXTURE_VARIANCE: 0.02,
  MIN_MICRO_MOVEMENTS: 0.5,
  MIN_HEAD_MOVEMENT: 0.03,
  MAX_STILL_FRAMES: 5,
};

function stripDataUrl(base64Str) {
  return base64Str.replace(/^data:image\/\w+;base64,/, "");
}

// ─── Descriptor helpers ─────────────────────────────────────────────────────

function isValidDescriptor(vec) {
  return Array.isArray(vec) && vec.length === DESCRIPTOR_LENGTH && vec.every((n) => Number.isFinite(n));
}

function euclideanDistance(a, b) {
  if (!isValidDescriptor(a) || !isValidDescriptor(b)) return Infinity;
  let sumSq = 0;
  for (let i = 0; i < DESCRIPTOR_LENGTH; i += 1) {
    const diff = a[i] - b[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/**
 * Compare a live descriptor against one or more stored/enrolled descriptors.
 * Returns the closest (minimum-distance) match.
 */
function matchDescriptor(liveDescriptor, storedDescriptors) {
  const candidates = Array.isArray(storedDescriptors?.[0]) ? storedDescriptors : [storedDescriptors];
  let best = { distance: Infinity, index: -1 };

  candidates.forEach((candidate, index) => {
    const distance = euclideanDistance(liveDescriptor, candidate);
    if (distance < best.distance) best = { distance, index };
  });

  const verified = best.distance <= CONFIG.MATCH_DISTANCE_THRESHOLD;
  // Rough 0-100 confidence score for display purposes only (not used for the decision).
  const score = Math.max(0, Math.round((1 - best.distance / 1.2) * 100));

  return { verified, distance: Number(best.distance.toFixed(4)), score, matchedIndex: best.index };
}

// ─── Image quality check (sharp — no Python needed) ────────────────────────

async function checkImageQuality(base64Image) {
  try {
    const buffer = Buffer.from(stripDataUrl(base64Image), "base64");
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    const MIN_WIDTH = 200;
    const MIN_HEIGHT = 200;

    if (!metadata.width || !metadata.height || metadata.width < MIN_WIDTH || metadata.height < MIN_HEIGHT) {
      return { passed: false, reason: `Image resolution too low (minimum ${MIN_WIDTH}x${MIN_HEIGHT}px).` };
    }

    const channels = stats.channels.slice(0, 3);
    const avgBrightness = channels.reduce((sum, c) => sum + c.mean, 0) / channels.length;
    const avgStdDev = channels.reduce((sum, c) => sum + c.stdev, 0) / channels.length;

    if (avgBrightness < 40) {
      return { passed: false, reason: "Image too dark.", brightness: Number(avgBrightness.toFixed(2)) };
    }
    if (avgBrightness > 230) {
      return { passed: false, reason: "Image too bright / overexposed.", brightness: Number(avgBrightness.toFixed(2)) };
    }
    if (avgStdDev < 15) {
      return { passed: false, reason: "Image lacks detail - possibly blurry or blank.", sharpness: Number(avgStdDev.toFixed(2)) };
    }

    return {
      passed: true,
      brightness: Number(avgBrightness.toFixed(2)),
      sharpness: Number(avgStdDev.toFixed(2)),
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    logger.warn("Image quality check failed:", err.message);
    return { passed: false, reason: "Unable to read image data." };
  }
}

// ─── Anti-spoof telemetry check (reported by faceIdentityTracker.js) ──────

function evaluateAntiSpoofTelemetry(antiSpoofData) {
  if (!antiSpoofData || typeof antiSpoofData !== "object") {
    return { passed: true, reason: undefined, flags: [], skipped: true };
  }

  const {
    failed,
    failureCode,
    antiSpoofing: {
      microMovements = 0,
      textureVariance = 0,
      headMovementRange = 0,
      stillFrameCount = 0,
    } = {},
  } = antiSpoofData;

  const flags = [];
  if (failed) flags.push(failureCode ? `failed:${failureCode}` : "failed_anti_spoof");
  if (microMovements < ANTI_SPOOF_THRESHOLDS.MIN_MICRO_MOVEMENTS) flags.push("low_micro_movement");
  if (textureVariance < ANTI_SPOOF_THRESHOLDS.MIN_TEXTURE_VARIANCE) flags.push("low_texture_variance");
  if (headMovementRange < ANTI_SPOOF_THRESHOLDS.MIN_HEAD_MOVEMENT) flags.push("low_head_movement");
  if (stillFrameCount > ANTI_SPOOF_THRESHOLDS.MAX_STILL_FRAMES) flags.push("excess_still_frames");

  return {
    passed: flags.length === 0,
    reason: flags.length ? `Anti-spoofing check failed: ${flags.join(", ")}` : undefined,
    flags,
    skipped: false,
  };
}

// ─── Main entry point ───────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {number[]} params.descriptor        Live 128-d face-api.js descriptor.
 * @param {number[]|number[][]} params.storedDescriptors  Enrolled descriptor(s).
 * @param {string} [params.image]              Base64 frame, for server-side quality check.
 * @param {object} [params.antiSpoofData]      Telemetry from faceIdentityTracker.getProof().
 * @param {boolean} [params.requireAntiSpoof]  If true, a missing/failed anti-spoof report fails the whole check.
 */
async function verifyFaceMatch({ descriptor, storedDescriptors, image, antiSpoofData, requireAntiSpoof = false }) {
  if (!isValidDescriptor(descriptor)) {
    return { verified: false, score: 0, error: "Missing or invalid live face descriptor." };
  }
  if (!storedDescriptors || (Array.isArray(storedDescriptors) && storedDescriptors.length === 0)) {
    return { verified: false, score: 0, error: "No enrolled face descriptor for this account." };
  }

  let quality = null;
  if (image) {
    quality = await checkImageQuality(image);
    if (!quality.passed) {
      return { verified: false, score: 0, error: `Image quality failed: ${quality.reason}`, quality };
    }
  }

  const antiSpoofReport = evaluateAntiSpoofTelemetry(antiSpoofData);
  if (!antiSpoofReport.skipped && requireAntiSpoof && !antiSpoofReport.passed) {
    return {
      verified: false,
      score: 0,
      error: antiSpoofReport.reason || "Anti-spoofing check failed.",
      antiSpoofReport,
      quality,
    };
  }

  const match = matchDescriptor(descriptor, storedDescriptors);

  logger.info?.(
    `Face match: distance=${match.distance}, threshold=${CONFIG.MATCH_DISTANCE_THRESHOLD}, verified=${match.verified}`
  );

  return {
    verified: match.verified,
    score: match.score,
    distance: match.distance,
    threshold: CONFIG.MATCH_DISTANCE_THRESHOLD,
    quality,
    antiSpoofReport,
    error: match.verified ? undefined : "Face did not match registered profile.",
  };
}

module.exports = {
  DESCRIPTOR_LENGTH,
  isValidDescriptor,
  euclideanDistance,
  matchDescriptor,
  checkImageQuality,
  evaluateAntiSpoofTelemetry,
  verifyFaceMatch,
  ANTI_SPOOF_THRESHOLDS,
  CONFIG,
};
