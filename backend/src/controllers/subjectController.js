const Subject = require("../models/Subject");
const { success, error } = require("../utils/response");

// ─── POST /api/subjects ───────────────────────────────────────────────────────
const createSubject = async (req, res, next) => {
  try {
    const { name, code, department, year } = req.body;
    if (!name) return error(res, "Subject name is required", 400);

    const subject = await Subject.create({ name, code, department, year });
    return success(res, { subject }, "Subject created", 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/subjects ────────────────────────────────────────────────────────
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });
    return success(res, { subjects }, "Subjects fetched");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/subjects/:id ────────────────────────────────────────────────────
const updateSubject = async (req, res, next) => {
  try {
    const { name, code, department, year, isActive } = req.body;
    const updates = { name, code, department, isActive };
    if (typeof year !== "undefined") updates.year = year;

    const subject = await Subject.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!subject) return error(res, "Subject not found", 404);
    return success(res, { subject }, "Subject updated");
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/subjects/:id ─────────────────────────────────────────────────
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return error(res, "Subject not found", 404);
    return success(res, {}, "Subject deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { createSubject, getSubjects, updateSubject, deleteSubject };
