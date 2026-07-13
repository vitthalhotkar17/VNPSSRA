const jwt = require("jsonwebtoken");

/**
 * Sign a JWT token containing the user's id and role.
 * @param {object} payload  - { id, role }
 * @returns {string} signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
