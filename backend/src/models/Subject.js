const mongoose = require("mongoose");

/**
 * Subject — master list of subjects managed by admin.
 */
const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true },
    department: { type: String, trim: true },
    year: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ department: 1 });

module.exports = mongoose.model("Subject", subjectSchema);
