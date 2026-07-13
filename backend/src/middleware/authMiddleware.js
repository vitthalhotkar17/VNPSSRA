const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { error } = require("../utils/response");

/**
 * protect — verifies the JWT in the Authorization header.
 * Attaches the full user document to req.user on success.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (ensures account wasn't deleted since token was issued)
    // We need stored face embeddings for verification flows, so select them explicitly.
    const user = await User.findById(decoded.id).select("+faceEmbeddings");
    if (!user || !user.isActive) {
      return error(res, "User not found or account is disabled.", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return error(res, "Token expired. Please login again.", 401);
    }
    return error(res, "Invalid token.", 401);
  }
};

module.exports = { protect };
