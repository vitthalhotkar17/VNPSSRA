                                              import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { reportService } from "../../services/reportService.js";
import { Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const getSessionLabel = (record) => {
  if (!record) return "Session";
  if (record.sessionName || record.subject) return record.sessionName || record.subject;
  if (typeof record.sessionId === "object" && record.sessionId?.subject) return record.sessionId.subject;
  if (typeof record.sessionId === "string") return record.sessionId;
  return "Session";
};

export default function StudentReports() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const studentId = user?._id || user?.id || user?.userId;

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      if (!studentId) {
        if (!ignore) setS({ total: 0, present: 0, absent: 0, percentage: 0, records: [] });
        return;
      }

      try {
        const data = await reportService.studentSummary(studentId);
        if (!ignore) setS(data);
      } catch (err) {
        if (!ignore) setS({ total: 0, present: 0, absent: 0, percentage: 0, records: [] });
      }
    };

    loadSummary();
    const interval = window.setInterval(loadSummary, 10000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [studentId]);

  if (!s) return null;

  const data = [{ name: "Present", value: s.present ?? 0 }, { name: "Absent", value: s.absent ?? 0 }];
  const records = Array.isArray(s.records) ? s.records : [];
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-6 lg:col-span-1">
        <h3 className="font-display font-bold">Overall</h3>
        <div className="h-60">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80}>
                <Cell fill="#10b981" /><Cell fill="#f43f5e" />
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-3xl font-bold">{s.percentage ?? 0}%</p>
        <p className="text-center text-slate-500 text-sm">Attendance rate</p>
      </div>
      <div className="card p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold">Records</h3>
          <button
            onClick={() => reportService.downloadCSV(records, "attendance.csv")}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Download size={16} /> Export
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 border-b border-slate-100">
            <tr><th className="py-2">Session</th><th>Student</th><th>Status</th><th>Location</th><th>Time</th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-400">No records</td></tr>}
            {records.map((r) => (
              <tr key={r.id || r._id} className="border-b border-slate-50">
                <td className="py-3 font-medium">{getSessionLabel(r)}</td>
                <td className="text-slate-600">{r.studentName || user?.name || "Student"}</td>
                <td><span className="chip bg-emerald-50 text-emerald-700">{r.status}</span></td>
                <td className="text-slate-500">{r.lat != null && r.lng != null ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : "—"}</td>
                <td className="text-slate-500">{new Date(r.timestamp || r.checkIn || r.createdAt || r.date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
