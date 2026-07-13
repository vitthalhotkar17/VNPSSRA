const mongoose = require("mongoose");

/**
 * Assignment — maps a faculty member to one or more subjects.
 * One document per faculty; subjects is an array of strings.
 */
const assignmentSchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    subjects: [{ type: String, trim: true }],
  },
  { timestamps: true }
);


module.exports = mongoose.model("Assignment", assignmentSchema);
