const VALID_ACADEMIC_YEARS = [
  "First Year",
  "Second Year",
  "Third Year",
  "Fourth Year",
];

const YEAR_NUMBER_MAP = {
  1: "First Year",
  2: "Second Year",
  3: "Third Year",
  4: "Fourth Year",
};

const YEAR_TEXT_MAP = {
  first: "First Year",
  second: "Second Year",
  third: "Third Year",
  fourth: "Fourth Year",
  "1": "First Year",
  "2": "Second Year",
  "3": "Third Year",
  "4": "Fourth Year",
  "year 1": "First Year",
  "year 2": "Second Year",
  "year 3": "Third Year",
  "year 4": "Fourth Year",
};

const normalizeAcademicYear = (value) => {
  if (value == null || value === "") return null;

  if (typeof value === "number") {
    return YEAR_NUMBER_MAP[value] || null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (VALID_ACADEMIC_YEARS.includes(trimmed)) {
      return trimmed;
    }

    const normalized = trimmed.toLowerCase();
    return YEAR_TEXT_MAP[normalized] || null;
  }

  return null;
};

const isValidAcademicYear = (value) => Boolean(normalizeAcademicYear(value));

module.exports = {
  normalizeAcademicYear,
  isValidAcademicYear,
  VALID_ACADEMIC_YEARS,
};
