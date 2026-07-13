const mongoose = require("mongoose");
const Department = require("../models/Department");
const User = require("../models/User");
const { buildFacultyDepartmentQuery } = require("../utils/departmentAccess");
const { success, error } = require("../utils/response");

const buildFacultyFilter = ({ department, search }) => {
  const filter = { role: "faculty" };

  if (department) {
    filter.department = department;
  }

  if (search) {
    const keyword = search.trim();
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { employeeId: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
      ];
    }
  }

  return filter;
};

const listFacultyForStudent = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return error(res, "Only students can view department faculty", 403);
    }

    if (!req.user.department) {
      return success(res, { faculty: [] }, "No department assigned");
    }

    const facultyQuery = buildFacultyDepartmentQuery(req.user.department);

    let faculty = await User.find(facultyQuery)
      .select("name employeeId department")
      .populate("department", "name code")
      .sort({ name: 1 });

    if (!faculty.length) {
      faculty = await User.find({ role: "faculty", isActive: true })
        .select("name employeeId department")
        .populate("department", "name code")
        .sort({ name: 1 });
    }

    return success(res, { faculty }, "Faculty fetched");
  } catch (err) {
    next(err);
  }
};

const listFaculty = async (req, res, next) => {
  try {
    const { department, search, page = 1, limit = 10, sortBy = "name", sortOrder = "asc" } = req.query;
    const filter = buildFacultyFilter({ department, search });
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const sortDirection = sortOrder === "desc" ? -1 : 1;

    const [faculty, total] = await Promise.all([
      User.find(filter)
        .populate("department", "name code")
        .sort({ [sortBy]: sortDirection })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      User.countDocuments(filter),
    ]);

    return success(
      res,
      {
        faculty,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      },
      "Faculty fetched"
    );
  } catch (err) {
    next(err);
  }
};

const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await User.findOne({ _id: req.params.id, role: "faculty" }).populate("department", "name code");
    if (!faculty) return error(res, "Faculty not found", 404);
    return success(res, { faculty }, "Faculty fetched");
  } catch (err) {
    next(err);
  }
};

const createFaculty = async (req, res, next) => {
  try {
    const { name, email, password, department, employeeId, contact, status, assignedYears } = req.body;

    if (!name || !email || !employeeId || !department) {
      return error(res, "Name, email, employee ID, and department are required", 400);
    }

    if (!mongoose.isValidObjectId(department)) {
      return error(res, "Department must be a valid department ID", 400);
    }

    // Validate assignedYears
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    let yearsToAssign = [];
    if (assignedYears) {
      if (Array.isArray(assignedYears)) {
        yearsToAssign = assignedYears.filter(year => validYears.includes(year));
      } else {
        if (validYears.includes(assignedYears)) {
          yearsToAssign = [assignedYears];
        }
      }
    }

    const departmentDoc = await Department.findById(department);
    if (!departmentDoc) return error(res, "Department not found", 404);

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail, role: "faculty" });
    if (existingEmail) return error(res, "Faculty email already exists", 409);

    const existingEmployeeId = await User.findOne({ employeeId: employeeId.trim(), role: "faculty" });
    if (existingEmployeeId) return error(res, "Employee ID already exists", 409);

    const faculty = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password || "faculty123",
      role: "faculty",
      department: departmentDoc._id,
      employeeId: employeeId.trim(),
      contact: contact?.trim() || "N/A",
      isActive: status !== "Inactive",
      assignedYears: yearsToAssign,
    });

    return success(res, { faculty }, "Faculty created", 201);
  } catch (err) {
    next(err);
  }
};

const updateFaculty = async (req, res, next) => {
  try {
    const { name, email, department, employeeId, contact, status, assignedYears } = req.body;

    if (!name || !email || !employeeId || !department) {
      return error(res, "Name, email, employee ID, and department are required", 400);
    }

    if (!mongoose.isValidObjectId(department)) {
      return error(res, "Department must be a valid department ID", 400);
    }

    // Validate assignedYears
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    let yearsToAssign = [];
    if (assignedYears) {
      if (Array.isArray(assignedYears)) {
        yearsToAssign = assignedYears.filter(year => validYears.includes(year));
      } else {
        if (validYears.includes(assignedYears)) {
          yearsToAssign = [assignedYears];
        }
      }
    }

    const departmentDoc = await Department.findById(department);
    if (!departmentDoc) return error(res, "Department not found", 404);

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail, role: "faculty", _id: { $ne: req.params.id } });
    if (existingEmail) return error(res, "Faculty email already exists", 409);

    const existingEmployeeId = await User.findOne({ employeeId: employeeId.trim(), role: "faculty", _id: { $ne: req.params.id } });
    if (existingEmployeeId) return error(res, "Employee ID already exists", 409);

    const faculty = await User.findOneAndUpdate(
      { _id: req.params.id, role: "faculty" },
      {
        name: name.trim(),
        email: normalizedEmail,
        department: departmentDoc._id,
        employeeId: employeeId.trim(),
        contact: contact?.trim() || "N/A",
        isActive: status !== "Inactive",
        assignedYears: yearsToAssign,
      },
      { new: true, runValidators: true }
    );

    if (!faculty) return error(res, "Faculty not found", 404);
    return success(res, { faculty }, "Faculty updated");
  } catch (err) {
    next(err);
  }
};

const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await User.findOne({ _id: req.params.id, role: "faculty" });
    if (!faculty) return error(res, "Faculty not found", 404);
    await User.findByIdAndDelete(req.params.id);
    return success(res, {}, "Faculty deleted");
  } catch (err) {
    next(err);
  }
};

const updateFacultyAcademicYears = async (req, res, next) => {
  try {
    const { assignedYears } = req.body;

    if (!assignedYears) {
      return error(res, "assignedYears array is required", 400);
    }

    // Validate assignedYears
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    if (!Array.isArray(assignedYears)) {
      return error(res, "assignedYears must be an array", 400);
    }

    const yearsToAssign = assignedYears.filter(year => validYears.includes(year));
    if (yearsToAssign.length === 0) {
      return error(res, "At least one valid academic year must be assigned", 400);
    }

    const faculty = await User.findOneAndUpdate(
      { _id: req.params.id, role: "faculty" },
      { assignedYears: yearsToAssign },
      { new: true }
    );

    if (!faculty) return error(res, "Faculty not found", 404);
    return success(res, { faculty }, "Academic years updated successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listFacultyForStudent,
  listFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  updateFacultyAcademicYears,
};
