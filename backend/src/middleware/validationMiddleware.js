const { validationResult } = require("express-validator");
const { error } = require("../utils/response");

/**
 * validate — runs after express-validator check() chains.
 * Returns 400 with an array of field errors if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, "Validation failed", 400, errors.array());
  }
  next();
};

module.exports = { validate };
