/**
 * livenessChallengeStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Issues short-lived, random "liveness challenges" (blink / turn head) that the
 * frontend must satisfy before a face verification or attendance-mark request
 * is accepted.
 *
 * Why this exists:
 *   Without a server-issued challenge, a malicious client could simply hard-code
 *   `{ livenessMetrics: { blinkDetected: true, ... } }` in the request body and
 *   bypass liveness entirely. By having the SERVER pick the random action and
 *   remembering it, the client is forced to actually react to an instruction it
 *   could not have predicted in advance, and the metrics it reports are cross
 *   checked against that specific action (see faceRecognitionService.evaluateLivenessMetrics).
 *
 * This is a simple in-memory Map. That is enough for a single Node process
 * (fine for this project / most deployments). If SAMS is ever scaled to
 * multiple backend instances behind a load balancer, swap this for a shared
 * store (Redis, Mongo with a TTL index, etc.) — the function signatures below
 * are the only thing the rest of the app depends on.
 */

const crypto = require("crypto");

const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutes to complete the action
const ACTIONS = ["blink", "turn_left", "turn_right"];

/** @type {Map<string, { userId: string, action: string, expiresAt: number }>} */
const challenges = new Map();

// Periodically sweep expired challenges so the Map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, c] of challenges) {
    if (c.expiresAt < now) challenges.delete(id);
  }
}, 60 * 1000).unref?.();

/**
 * Create a new random challenge for a user, replacing any previous
 * un-used challenge they had (only one active challenge per user at a time).
 */
function createChallenge(userId) {
  // Invalidate any earlier challenge belonging to this user.
  for (const [id, c] of challenges) {
    if (c.userId === String(userId)) challenges.delete(id);
  }

  const challengeId = crypto.randomBytes(16).toString("hex");
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  challenges.set(challengeId, { userId: String(userId), action, expiresAt });

  return { challengeId, action, expiresAt };
}

/**
 * Validate that a challenge belongs to this user, matches the claimed action,
 * and has not expired. Optionally consumes (deletes) it so it cannot be reused.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateChallenge(challengeId, userId, action, { consume = false } = {}) {
  if (!challengeId) return { ok: false, reason: "Missing liveness challenge. Please retry the liveness check." };

  const record = challenges.get(challengeId);
  if (!record) return { ok: false, reason: "Liveness challenge not found or already used. Please retry." };

  if (record.userId !== String(userId)) {
    return { ok: false, reason: "Liveness challenge does not belong to this account." };
  }
  if (record.expiresAt < Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, reason: "Liveness challenge expired. Please retry." };
  }
  if (record.action !== action) {
    return { ok: false, reason: "Liveness action does not match the requested challenge." };
  }

  if (consume) challenges.delete(challengeId);
  return { ok: true };
}

module.exports = { createChallenge, validateChallenge, ACTIONS };
