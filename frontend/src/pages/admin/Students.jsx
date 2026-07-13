import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { reportService } from "../../services/reportService.js";
import { Trash2, Search, Edit2, X, Check, Download } from "lucide-react";
import toast from "react-hot-toast";

// Department mapping
const DEPARTMENT_MAP = {
  1: "CO",
  2: "EJ",
  3: "MECH",
  4: "CIVIL",
  5: "EC",
  6: "IT",
  7: "CHEM",
  8: "BT",
};

export default function AdminStudents() {
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (academicYearFilter) params.set("academicYear", academicYearFilter);
      const [{ data: studentData }, deptRes] = await Promise.all([
        api.get(`/admin/students?${params.toString()}`),
        api.get("/departments"),
      ]);
      setList(studentData.data?.students || []);
      setDepartments(deptRes.data?.data?.departments || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => { load(); }, [academicYearFilter]);

  const startEdit = (student) => {
    setEditing({ ...student });
  };

  const saveEdit = async () => {
    setLoading(true);
    try {
      await api.put(`/admin/students/${editing._id}`, editing);
      toast.success("Student updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this student? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/user/${id}`);
      toast.success("Student deleted");
      load();
    } catch (err) { toast.error(err.message); }
  };

  // Helper function to display department values as a plain string
  const findDepartmentMeta = (value) => {
    if (!value) return null;
    const raw = typeof value === "string" ? value.trim() : value;

    if (typeof raw === "string") {
      const normalized = raw.toLowerCase();
      let match = departments.find((dept) => String(dept._id) === raw);
      if (!match) match = departments.find((dept) => dept.code?.trim().toLowerCase() === normalized);
      if (!match) match = departments.find((dept) => dept.name?.trim().toLowerCase() === normalized);
      if (!match) match = departments.find((dept) => dept.department?.trim().toLowerCase() === normalized);
      return match || null;
    }

    if (typeof raw === "object") {
      if (raw._id) {
        const match = departments.find((dept) => String(dept._id) === String(raw._id));
        if (match) return match;
      }
      if (raw.code) {
        const normalized = String(raw.code).trim().toLowerCase();
        const match = departments.find((dept) => dept.code?.trim().toLowerCase() === normalized);
        if (match) return match;
      }
      if (raw.name) {
        const normalized = String(raw.name).trim().toLowerCase();
        const match = departments.find((dept) => dept.name?.trim().toLowerCase() === normalized);
        if (match) return match;
      }
    }

    return null;
  };

  const getDepartmentName = (deptValue) => {
    if (!deptValue) return "N/A";

    const meta = findDepartmentMeta(deptValue);
    if (meta) {
      return meta.code || meta.name || String(meta._id);
    }

    if (typeof deptValue === "string") {
      const trimmed = deptValue.trim();
      if (!trimmed) return "N/A";
      const normalizedKey = trimmed.toLowerCase();
      const aliasMap = {
        co: "CO",
        ej: "EJ",
        mech: "MECH",
        mechanical: "MECH",
        mechanicalengineering: "MECH",
        civil: "CIVIL",
        ec: "EC",
        it: "IT",
        chem: "CHEM",
        bt: "BT",
      };
      return aliasMap[normalizedKey] || DEPARTMENT_MAP[trimmed] || DEPARTMENT_MAP[normalizedKey] || trimmed;
    }

    if (typeof deptValue === "object") {
      if (typeof deptValue.code === "string" && deptValue.code.trim()) return deptValue.code.trim().toUpperCase();
      if (typeof deptValue.name === "string" && deptValue.name.trim()) return deptValue.name.trim();
      if (typeof deptValue.label === "string" && deptValue.label.trim()) return deptValue.label.trim();
      if (typeof deptValue.title === "string" && deptValue.title.trim()) return deptValue.title.trim();
      if (deptValue._id) return String(deptValue._id);
      return "N/A";
    }

    return String(deptValue);
  };

  const getDepartmentCode = (deptValue) => {
    if (!deptValue) return "";
    const meta = findDepartmentMeta(deptValue);
    if (meta) return meta.code || String(meta._id);
    if (typeof deptValue === "string") return deptValue.trim().toUpperCase();
    if (typeof deptValue === "object") {
      if (deptValue.code) return String(deptValue.code).trim().toUpperCase();
      if (deptValue.name) {
        const match = departments.find((dept) => dept.name?.trim().toLowerCase() === String(deptValue.name).trim().toLowerCase());
        if (match) return match.code || String(match._id);
        return String(deptValue.name).trim().toUpperCase();
      }
    }
    return String(deptValue);
  };

  const filtered = list.filter((u) =>
    (u.name + u.email + u.rollNo + getDepartmentName(u.department))
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  const exportStudents = () => {
    const rows = filtered.map((u) => ({
      name: u.name || "",
      email: u.email || "",
      rollNo: u.rollNo || "",
      department: getDepartmentName(u.department),
      year: u.year || "",
      contact: u.contact || "",
    }));
    reportService.downloadCSV(rows, "students.csv");
  };

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Edit modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 480, padding: 28, position: "relative" }}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
              Edit Student
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["name","Full Name"],["email","Email"],["rollNo","Roll No."],["contact","Contact"]].map(([field, label]) => (
                <div key={field} style={{ gridColumn: field === "name" || field === "email" ? "1 / -1" : "auto" }}>
                  <div className="label">{label}</div>
                  <input 
                    className="input" 
                    value={editing[field] || ""} 
                    onChange={(e) => setEditing({...editing, [field]: e.target.value})} 
                  />
                </div>
              ))}
              {/* Department as select */}
              <div>
                <div className="label">Department</div>
                <select 
                  className="input" 
                  value={getDepartmentCode(editing.department) || ""} 
                  onChange={(e) => setEditing({...editing, department: e.target.value})}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.code || dept.name || dept._id}>
                      {dept.code ? `${dept.code} — ${dept.name}` : dept.name || dept._id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Year</div>
                <select className="input" value={editing.year || 1} onChange={(e) => setEditing({...editing, year: +e.target.value})}>
                  {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="label">Academic Year</div>
                <select className="input" value={editing.academicYear || ""} onChange={(e) => setEditing({...editing, academicYear: e.target.value})}>
                  <option value="">Select Year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={loading}>
                <Check size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              All Students <span style={{ color: "var(--muted)", fontWeight: 400 }}>({filtered.length})</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={exportStudents}
                className="btn btn-primary btn-sm"
              >
                <Download size={14} /> Export
              </button>
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input className="input" style={{ paddingLeft: 34, width: 200 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table-base" style={{ width: "100%" }}>
              <thead>
                <tr><th>Name</th><th>Roll</th><th>Dept</th><th>Year</th><th>Contact</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>No students found</td></tr>
                )}
                {filtered.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{u.rollNo}</td>
                    <td>{getDepartmentName(u.department)}</td> {/* Display department name */}
                    <td>{u.year}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{u.contact}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(u)} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", cursor: "pointer" }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => remove(u._id)} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f87171", cursor: "pointer" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}