import { api } from "./api.js";

const resolveDepartmentParam = (department) => {
  if (!department) return null;
  if (typeof department === "string") return department;
  if (typeof department === "object") {
    return department._id || department.id || department.code || department.name || department.department || null;
  }
  return String(department);
};

export function normalizeAttendancePayload(payload) {
  if (Array.isArray(payload)) return payload;

  const source = payload?.data ?? payload;
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    if (Array.isArray(source.records)) return source.records;
    if (Array.isArray(source.data?.records)) return source.data.records;
  }

  return [];
}

export const attendanceService = {
  // ── Sessions ──────────────────────────────────────────────────────────────

  async getActiveSession(academicYear, department) {
    const params = [];
    if (academicYear != null) params.push(`academicYear=${encodeURIComponent(String(academicYear))}`);
    const resolvedDepartment = resolveDepartmentParam(department);
    if (resolvedDepartment) params.push(`department=${encodeURIComponent(resolvedDepartment)}`);
    const query = params.length ? `?${params.join("&")}` : "";
    const { data } = await api.get(`/sessions/active${query}`);
    return data.data?.session || null;
  },

  async listSessions() {
    const { data } = await api.get("/sessions");
    return data.data?.sessions || [];
  },

  async startSession({ subject, lat, lng, academicYear }) {
    const { data } = await api.post("/sessions/start", { subject, lat, lng, academicYear });
    return data.data.session;
  },

  async stopSession(id) {
    const { data } = await api.put(`/sessions/end/${id}`);
    return data.data;
  },

  // ── Attendance ────────────────────────────────────────────────────────────

  async markAttendance({ sessionId, faceImage, faceSignature, faceDescriptor, identityProof, lat, lng }) {
    const { data } = await api.post("/attendance/mark", {
      sessionId,
      faceImage,
      faceSignature,
      faceDescriptor,
      identityProof,
      lat,
      lng,
    });
    return data.data;
  },

  async getHistory() {
    const { data } = await api.get("/attendance/history");
    return data.data?.records || [];
  },

  async listAttendance(filter = {}) {
    const params = new URLSearchParams(filter).toString();
    const { data } = await api.get(`/attendance/report${params ? "?" + params : ""}`);
    return normalizeAttendancePayload(data);
  },

  async getStudentAttendance(studentId) {
    const { data } = await api.get(`/attendance/student/${studentId}`);
    const payload = data?.data ?? data;
    return {
      records: Array.isArray(payload?.records) ? payload.records : [],
      summary: payload?.summary || {},
      student: payload?.student || null,
      subjectBreakdown: payload?.subjectBreakdown || [],
      pagination: payload?.pagination || null,
    };
  },

  async getSessionAttendance(sessionId) {
    const { data } = await api.get(`/attendance/session/${sessionId}`);
    const payload = data?.data ?? data;
    return Array.isArray(payload?.records) ? payload.records : [];
  },
};

// Haversine distance in meters (kept for GPS UI)
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
