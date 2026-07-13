const Assignment = require("../models/Assignment");
const User = require("../models/User");
const { success, error } = require("../utils/response");

// ─── POST /api/assignments ────────────────────────────────────────────────────
// Create or replace the subject list for a faculty member
const createAssignment = async (req, res, next) => {
  try {
    const { facultyId, subjects } = req.body;
    if (!facultyId) {
      return error(res, "facultyId is required", 400);
    }

    const faculty = await User.findOne({ _id: facultyId, role: "faculty" });
    if (!faculty) return error(res, "Faculty not found", 404);

    const normalizedSubjects = [...new Set((subjects || [])
      .map((subject) => (subject || "").trim())
      .filter(Boolean))];

    const conflictingAssignments = await Assignment.find({
      facultyId: { $ne: facultyId },
      subjects: { $in: normalizedSubjects },
    }).select("subjects facultyId");

    if (conflictingAssignments.length) {
      const conflictNames = [...new Set(conflictingAssignments.flatMap((item) => item.subjects || []))]
        .filter((subject) => normalizedSubjects.includes(subject));

      if (conflictNames.length) {
        return error(res, `These subjects are already assigned to another faculty: ${conflictNames.join(", ")}`, 409);
      }
    }

    const assignment = await Assignment.findOneAndUpdate(
      { facultyId },
      { facultyId, subjects: normalizedSubjects },
      { upsert: true, new: true, runValidators: true }
    );

    return success(res, { assignment }, "Assignment saved", 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/assignments ─────────────────────────────────────────────────────
const getAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find()
      .populate("facultyId", "name email department");
    return success(res, { assignments }, "Assignments fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/assignments/faculty/:id ────────────────────────────────────────
// Get subjects assigned to a specific faculty (called by faculty on login)
const getAssignmentByFaculty = async (req, res, next) => {
  try {
    const assignment = await Assignment.findOne({ facultyId: req.params.id });
    return success(
      res,
      { subjects: assignment?.subjects || [] },
      "Faculty subjects fetched"
    );
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/assignments/:id ──────────────────────────────────────────────
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return error(res, "Assignment not found", 404);
    return success(res, {}, "Assignment deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentByFaculty,
  deleteAssignment,
};
