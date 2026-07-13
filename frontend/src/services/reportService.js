import { api } from "./api.js";

export const reportService = {
  async overallSummary() {
    const { data } = await api.get("/admin/dashboard");
    const d = data.data;
    return {
      students: d.totalStudents,
      faculty: d.totalFaculty,
      sessions: d.totalSessions,
      attendance: d.totalAttendance,
    };
  },

  async studentSummary(studentId) {
    try {
      const { data } = await api.get(`/attendance/student/${studentId}`);
      const payload = data?.data || {};
      const summary = payload.summary || {};
      const records = Array.isArray(payload.records) ? payload.records : [];

      return {
        total: summary.total ?? records.length ?? 0,
        present: summary.present ?? 0,
        absent: summary.absent ?? Math.max((summary.total ?? 0) - (summary.present ?? 0), 0),
        percentage: summary.percentage ?? 0,
        records,
        student: payload.student || null,
        subjectBreakdown: payload.subjectBreakdown || [],
      };
    } catch (err) {
      console.error("studentSummary failed", err);
      return { total: 0, present: 0, absent: 0, percentage: 0, records: [] };
    }
  },

  async facultySummary(facultyId) {
    const { data } = await api.get(`/sessions?facultyId=${facultyId}`);
    return data.data?.sessions || [];
  },

  downloadCSV(rows, filename = "report.csv") {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
