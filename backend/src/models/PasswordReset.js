const mongoose = require("mongoose");

/**
 * PasswordReset — stores one-time tokens for forgot-password flow.
 * TTL index automatically removes expired documents.
 */
const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // 1 hour TTL
});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
