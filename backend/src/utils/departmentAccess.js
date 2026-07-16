const mongoose = require("mongoose");

// Only treat a string as an ObjectId if it's actually a 24-char hex string.
// mongoose.Types.ObjectId.isValid() wrongly returns true for ANY 12-character
// string (because a 12-byte string can be cast to an ObjectId), which caused
// department codes/names of exactly 12 characters to be misrouted into the
// ObjectId branch of the query and silently fail to match.
const isHexObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

// Strip null bytes and other non-printable control characters. MongoDB
// rejects strings/regexes containing null bytes outright ("must not contain
// null bytes"), which happens when a raw Buffer/binary value gets decoded as
// UTF-8 text and produces garbage. Sanitizing here means a corrupted
// department value degrades to "no match" instead of crashing the query.
const sanitizeText = (value) =>
  String(value)
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();

// Safely turn a value into a hex string ONLY if it's actually a proper
// ObjectId or 12-byte Buffer — never blindly call .toString() on an unknown
// object, since a raw Buffer decoded as UTF-8 produces corrupted text with
// embedded null bytes.
const safeIdToHex = (value) => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString(); // ObjectId#toString() always returns clean hex
  }
  if (Buffer.isBuffer(value)) {
    return value.length === 12 ? value.toString("hex") : null; // garbage-length buffer, skip it
  }
  if (value && value.buffer && Buffer.isBuffer(value.buffer)) {
    // Mongoose sometimes wraps binary as { buffer: <Buffer> }
    return value.buffer.length === 12 ? value.buffer.toString("hex") : null;
  }
  return null;
};

const normalizeDepartmentValue = (value) => {
  if (value == null || value === "") return "";

  if (typeof value === "object") {
    const idHex = safeIdToHex(value);
    if (idHex) return idHex.toLowerCase();

    const candidate =
      value._id || value.id || value.code || value.name || value.department || value.title || value.label;
    if (candidate != null) return sanitizeText(candidate).toLowerCase();
    return "";
  }

  return sanitizeText(value).toLowerCase();
};

const collectDepartmentCandidates = (value) => {
  if (value == null || value === "") return [];

  const candidates = [];

  if (typeof value === "object") {
    const idHex = safeIdToHex(value);
    if (idHex) candidates.push(idHex);

    [value._id, value.id, value.code, value.name, value.department, value.title, value.label].forEach((candidate) => {
      if (candidate != null && candidate !== "") {
        const clean = sanitizeText(candidate);
        if (clean) candidates.push(clean);
      }
    });

    // Only fall back to raw toString() for plain objects with no buffer/id
    // shape — never for Buffers, which is what corrupts the query.
    if (!idHex && !Buffer.isBuffer(value) && value.toString && typeof value.toString === "function") {
      const defaultValue = sanitizeText(value.toString());
      if (defaultValue && defaultValue !== "[object Object]" && !candidates.includes(defaultValue)) {
        candidates.push(defaultValue);
      }
    }
  } else if (typeof value === "string") {
    const trimmed = sanitizeText(value);
    if (trimmed) candidates.push(trimmed);
  }

  return candidates.filter((candidate, index, all) => all.indexOf(candidate) === index);
};

/**
 * Builds a Mongo query fragment that matches a `department` field regardless of
 * whether it's stored as an ObjectId reference, a plain string code/name, or an
 * embedded object — and regardless of letter case (this was the main bug: text
 * values were compared case-sensitively, so "Computer Science" would never match
 * a document stored as "computer science").
 */
const buildDepartmentQuery = (departmentValue) => {
  const values = collectDepartmentCandidates(departmentValue);
  if (values.length === 0) {
    return {};
  }

  const hexCandidates = values.filter((value) => typeof value === "string" && isHexObjectId(value));

  // A hex-looking value might be stored as a real ObjectId on one document
  // and as a plain string on another (this is exactly what happened here:
  // faculty.department is an ObjectId, student.department is the same value
  // saved as a string). Match BOTH representations so the query works
  // regardless of which BSON type a given record actually used.
  const objectIds = hexCandidates.map((value) => new mongoose.Types.ObjectId(value));
  const hexAsStrings = hexCandidates; // exact string match, same value

  const textValues = values.filter((value) => typeof value === "string" && value.trim() && !isHexObjectId(value));

  if (objectIds.length === 0 && textValues.length === 0 && hexAsStrings.length === 0) {
    return {};
  }

  const query = { $or: [] };

  if (objectIds.length > 0) {
    query.$or.push({ department: { $in: objectIds } });
  }

  if (hexAsStrings.length > 0) {
    query.$or.push({ department: { $in: hexAsStrings } });
  }

  if (textValues.length > 0) {
    // Case-insensitive exact match per candidate value.
    // Escape regex special characters so department names with symbols
    // (e.g. "R&D") don't break the pattern.
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = textValues
      .map((value) => sanitizeText(value))
      .filter((value) => value.length > 0 && !value.includes("\u0000"))
      .map((value) => new RegExp(`^${escapeRegex(value)}$`, "i"));
    if (patterns.length > 0) {
      query.$or.push({ department: { $in: patterns } });
    }
  }

  return query;
};

const isDepartmentMatch = (a, b) => {
  if (!a || !b) return false;

  const leftValues = collectDepartmentCandidates(a).map((value) => normalizeDepartmentValue(value));
  const rightValues = collectDepartmentCandidates(b).map((value) => normalizeDepartmentValue(value));

  return leftValues.some((value) => rightValues.includes(value));
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

  const deptQuery = buildDepartmentQuery(user.department);

  // If the faculty member has no usable department value, do NOT fall through
  // to "match everything" — that would leak all students to a misconfigured
  // faculty account. Instead, force zero results so the gap is obvious
  // (empty dashboard + you can see in logs that department is unset)
  // rather than silently showing everyone.
  if (Object.keys(deptQuery).length === 0) {
    return { ...baseFilter, role: "student", _id: { $in: [] } };
  }

  return {
    ...baseFilter,
    role: "student",
    ...deptQuery,
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
  collectDepartmentCandidates,
};