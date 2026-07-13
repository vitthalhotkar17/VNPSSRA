const { error } = require("../utils/response");

/**
 * authorise — factory that returns a middleware restricting access by role.
 *
 * Usage:
 *   router.get("/admin-only", protect, authorise("admin"), controller)
 *   router.get("/staff",      protect, authorise("admin", "faculty"), controller)
 */
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return error(res, "Not authenticated.", 401);
    if (!roles.includes(req.user.role)) {
      return error(
        res,
        `Role '${req.user.role}' is not authorised to access this resource.`,
        403
      );
    }
    next();
  };
};

module.exports = { authorise };
