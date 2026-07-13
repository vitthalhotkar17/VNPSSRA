const mongoose = require("mongoose");

const normalizeDepartmentValue = (value) => {
  if (value == null || value === "") return "";

  if (typeof value === "object") {
    const candidate = value._id || value.id || value.code || value.name || value.department || value.title || value.label;
    if (!candidate && value.toString && typeof value.toString === "function") {
      return String(value.toString()).trim().toLowerCase();
    }
    return String(candidate || "").trim().toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

const buildDepartmentQuery = (departmentValue) => {
  const values = [];

  if (departmentValue && typeof departmentValue === "object") {
    if (departmentValue._id) values.push(departmentValue._id);
    if (departmentValue.id) values.push(departmentValue.id);
    if (departmentValue.code) values.push(departmentValue.code);
    if (departmentValue.name) values.push(departmentValue.name);
    if (departmentValue.department) values.push(departmentValue.department);
    if (departmentValue.title) values.push(departmentValue.title);
    if (departmentValue.label) values.push(departmentValue.label);
  } else if (typeof departmentValue === "string") {
    values.push(departmentValue);
  }

  if (values.length === 0) {
    return {};
  }

  const objectIds = values
    .filter((value) => {
      if (!value) return false;
      if (typeof value === "string") return mongoose.Types.ObjectId.isValid(value);
      return value instanceof mongoose.Types.ObjectId || (value?.toString && mongoose.Types.ObjectId.isValid(value.toString()));
    })
    .map((value) => (typeof value === "string" ? new mongoose.Types.ObjectId(value) : value));

  const textValues = values
    .filter((value) => typeof value === "string" && value.trim() && !mongoose.Types.ObjectId.isValid(value));

  if (objectIds.length === 0 && textValues.length === 0) {
    return {};
  }

  const query = { $or: [] };
  if (objectIds.length > 0) {
    query.$or.push({ department: { $in: objectIds } });
  }
  if (textValues.length > 0) {
    query.$or.push({ department: { $in: textValues } });
  }

  return query;
};

const isDepartmentMatch = (a, b) => {
  if (!a || !b) return false;
  return normalizeDepartmentValue(a) === normalizeDepartmentValue(b);
};

const buildFacultyDepartmentQuery = (departmentValue) => {
  return {
    role: "faculty",
    isActive: true,
    ...buildDepartmentQuery(departmentValue),
  };
};

const buildFacultyStudentFilter = (user, baseFilter = {}) => {
  if (!user || user.role !== "faculty") {
    return { ...baseFilter };
  }

  return {
    ...baseFilter,
    role: "student",
    department: user.department,
  };
};

const isFacultyAllowedForDepartment = (user, department) => {
  if (!user || user.role !== "faculty") {
    return true;
  }

  return Boolean(user.department && isDepartmentMatch(department, user.department));
};

module.exports = {
  buildFacultyStudentFilter,
  buildFacultyDepartmentQuery,
  isFacultyAllowedForDepartment,
  isDepartmentMatch,
  buildDepartmentQuery,
};
