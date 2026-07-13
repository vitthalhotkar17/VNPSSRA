const mongoose = require("mongoose");
const Department = require("../models/Department");
const User = require("../models/User");
const { success, error } = require("../utils/response");

const listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return success(res, { departments }, "Departments fetched");
  } catch (err) {
    next(err);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return error(res, "Department not found", 404);
    return success(res, { department }, "Department fetched");
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, status } = req.body;

    if (!name || !code) return error(res, "Department name and code are required", 400);

    const existingName = await Department.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (existingName) return error(res, "Department name already exists", 409);

    const existingCode = await Department.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) return error(res, "Department code already exists", 409);

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || "",
      status: status || "Active",
    });

    return success(res, { department }, "Department created", 201);
  } catch (err) {
    next(err);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { name, code, description, status } = req.body;

    if (!name || !code) return error(res, "Department name and code are required", 400);

    const existingName = await Department.findOne({
      name: new RegExp(`^${name.trim()}$`, "i"),
      _id: { $ne: req.params.id },
    });
    if (existingName) return error(res, "Department name already exists", 409);

    const existingCode = await Department.findOne({
      code: code.trim().toUpperCase(),
      _id: { $ne: req.params.id },
    });
    if (existingCode) return error(res, "Department code already exists", 409);

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || "",
        status: status || "Active",
      },
      { new: true, runValidators: true }
    );

    if (!department) return error(res, "Department not found", 404);
    return success(res, { department }, "Department updated");
  } catch (err) {
    next(err);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return error(res, "Department not found", 404);

    const assignedFaculty = await User.countDocuments({ role: "faculty", department: req.params.id });
    if (assignedFaculty > 0) {
      return error(res, "Department cannot be deleted while faculty members are assigned to it", 409);
    }

    await Department.findByIdAndDelete(req.params.id);
    return success(res, {}, "Department deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
