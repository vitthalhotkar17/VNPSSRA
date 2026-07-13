const nodemailer = require("nodemailer");

/**
 * Nodemailer transporter configured from environment variables.
 * Uses Gmail SMTP by default; swap host/port for other providers.
 */
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.MAIL_PORT || "587"),
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

module.exports = transporter;

