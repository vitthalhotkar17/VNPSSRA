import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Mail, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../services/api.js";

export default function FacultyStudentsList() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const facultyDepartment = user?.department || "";

  const loadStudents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/students");
      const payload = data?.data?.students || data?.students || [];
      setStudents(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setStudents([]);
      toast.error(err.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const visibleStudents = useMemo(() => {
    const term = query.toLowerCase().trim();
    return students.filter((student) => {
      const matchesDepartment = !facultyDepartment || student.department === facultyDepartment;
      if (!matchesDepartment) return false;
      if (!term) return true;
      return [student.name, student.rollNo, student.email, student.department, student.semester, student.division]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [students, query, facultyDepartment]);

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <GraduationCap size={18} color="var(--primary)" />
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Your Department Students</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Only students from your assigned department are listed here and search stays scoped to that department.</p>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "var(--primary)", fontWeight: 700 }}>
            <Users size={16} />
            {visibleStudents.length} Students
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative", minWidth: 260, flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${facultyDepartment || "your department"} students by name, roll number, or email`}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
            {facultyDepartment || "Department assigned by admin"} • {visibleStudents.length} visible
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>Loading students...</div>
        ) : visibleStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>No students found in this department.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {visibleStudents.map((student) => {
              const initials = (student.name || "S")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <article
                  key={student._id || student.rollNo}
                  style={{
                    padding: 16,
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.08em" }}>{student.rollNo || "—"}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{student.status || "Active"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(99,102,241,0.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", fontWeight: 800 }}>
                      {student.profileImage ? <img src={student.profileImage} alt={student.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} /> : initials}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{student.name}</h4>
                      <p style={{ marginTop: 2, color: "var(--muted)" }}>{student.department || "—"}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                      <BookOpen size={14} />
                      <span>Semester {student.semester || student.year || "—"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                      <Users size={14} />
                      <span>Division {student.division || "—"}</span>
                    </div>
                    {student.email ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                        <Mail size={14} />
                        <span>{student.email}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
