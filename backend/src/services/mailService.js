const transporter = require("../config/mail");
const logger = require("../utils/logger");

/**
 * Send a custom message email — used when admin/faculty send a notification
 * that's also flagged to go out over email (see notificationController.js).
 *
 * @param {string} to        - recipient email
 * @param {object} opts
 * @param {string} opts.subject
 * @param {string} opts.message      - plain text body (will be escaped into HTML)
 * @param {string} opts.senderName   - display name of who sent it
 * @param {string} [opts.type]       - info | warning | success | alert (affects accent color)
 */
const TYPE_COLORS = {
  info: "#4f46e5",
  warning: "#d97706",
  success: "#059669",
  alert: "#dc2626",
};

const escapeHtml = (str = "") =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sendCustomMessageEmail = async (to, { subject, message, senderName, type = "info" }) => {
  const accent = TYPE_COLORS[type] || TYPE_COLORS.info;
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

  const mailOptions = {
    from: process.env.MAIL_FROM || "SAMS System <no-reply@sams.edu>",
    to,
    subject: `SAMS – ${subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:${accent};margin-top:0;">${escapeHtml(subject)}</h2>
        <p style="color:#374151;line-height:1.6;">${safeMessage}</p>
        <p style="margin-top:24px;font-size:12px;color:#6b7280;">
          Sent by ${escapeHtml(senderName || "SAMS")} via the Smart Attendance Management System.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Message email sent to ${to}`);
    return true;
  } catch (err) {
    logger.error(`Failed to send message email to ${to}:`, err.message);
    return false;
  }
};

/**
 * Send a password-reset email containing a reset link.
 *
 * @param {string} to     - recipient email
 * @param {string} link   - full reset URL with token
 */
const sendPasswordResetEmail = async (to, link) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || "SAMS System <no-reply@sams.edu>",
    to,
    subject: "SAMS – Password Reset Request",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
        <h2 style="color:#4f46e5;">Reset Your Password</h2>
        <p>You requested a password reset for your SAMS account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="margin-top:24px;font-size:12px;color:#6b7280;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}`);
  } catch (err) {
    logger.error("Failed to send reset email:", err.message);
    throw new Error("Could not send reset email. Check mail configuration.");
  }
};

module.exports = { sendPasswordResetEmail, sendCustomMessageEmail };
