import { useEffect, useMemo, useState } from "react";
import { Search, Users, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";

const departments = [
  { key: "CO", label: "CO", title: "Computer Engineering" },
  { key: "EJ", label: "EJ", title: "Electronics & Telecommunication" },
  { key: "Civil", label: "Civil", title: "Civil Engineering" },
  { key: "MK", label: "MK", title: "Mechanical Engineering" },
];

const normalizeDepartment = (value = "") => {
  const raw = typeof value === "string" ? value : value?.name || value?.departmentName || value?.title || String(value || "");
  const normalized = String(raw).trim().toLowerCase();

  if (["co", "computer engineering", "computer", "computer engg", "computer science", "cse"].includes(normalized)) return "CO";
  if (["ej", "electronics & telecommunication", "electronics and telecommunication", "electronics and telecom", "entc", "electronics"].includes(normalized)) return "EJ";
  if (["civil", "civil engineering"].includes(normalized)) return "Civil";
  if (["mk", "mechanical engineering", "mechanical", "mechanical engg"].includes(normalized)) return "MK";

  return String(raw).trim();
};

const getDepartmentMeta = (value, departmentList = []) => {
  if (!value) return null;

  const candidate = typeof value === "string"
    ? value
    : value?._id || value?.id || value?.code || value?.name || value?.department || value?.title || value?.label || String(value || "");

  const normalizedCandidate = String(candidate).trim();

  if (!normalizedCandidate) return null;

  const normalizedLower = normalizedCandidate.toLowerCase();
  const byId = departmentList.find((dept) => String(dept._id) === normalizedCandidate);
  if (byId) return byId;

  const byCode = departmentList.find((dept) => String(dept.code).trim().toLowerCase() === normalizedLower);
  if (byCode) return byCode;

  const byName = departmentList.find((dept) => String(dept.name).trim().toLowerCase() === normalizedLower);
  if (byName) return byName;

  return null;
};

const getDepartmentLabel = (value, departmentList = []) => {
  const meta = getDepartmentMeta(value, departmentList);
  if (meta) return meta.name || meta.code || String(value || "");

  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.name || value.departmentName || value.title || value.label || String(value || "");

  return String(value);
};

const getNormalizedDepartment = (value, departmentList = []) => {
  const meta = getDepartmentMeta(value, departmentList);
  if (meta?.code) return meta.code;
  return normalizeDepartment(value);
};

export default function DepartmentStudents() {
  const [students, setStudents] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("CO");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("All Years");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const academicYears = ["All Years", "First Year", "Second Year", "Third Year", "Fourth Year"];
  const yearLabelMap = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
  const getAcademicYearLabel = (student) => student.academicYear || yearLabelMap[student.year] || "";

  const [departmentsMeta, setDepartmentsMeta] = useState([]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/students");
      setStudents(data.data?.students || []);
    } catch (err) {
      toast.error(err.message || "Unable to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentsMeta = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartmentsMeta(data.data?.departments || []);
    } catch {
      setDepartmentsMeta([]);
    }
  };

  useEffect(() => {
    loadStudents();
    loadDepartmentsMeta();
  }, []);

  const filteredStudents = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    return students.filter((student) => {
      const departmentCode = getNormalizedDepartment(student.department, departmentsMeta);
      const studentAcademicYear = getAcademicYearLabel(student);
      const matchesDepartment = departmentCode === selectedDepartment;
      const matchesAcademicYear =
        selectedAcademicYear === "All Years" || studentAcademicYear === selectedAcademicYear;
      const matchesSearch =
        !searchTerm ||
        String(student.name || "").toLowerCase().includes(searchTerm) ||
        String(student.rollNo || "").toLowerCase().includes(searchTerm);

      return matchesDepartment && matchesAcademicYear && matchesSearch;
    });
  }, [students, query, selectedDepartment, selectedAcademicYear, departmentsMeta]);

  const departmentOptions = departmentsMeta.length
    ? departmentsMeta.map((dept) => ({
        key: String(dept.code || dept._id || dept.name || dept.title || dept.label || "").trim(),
        label: String(dept.code || dept.name || dept.title || dept.label || dept._id || "").trim(),
        title: String(dept.name || dept.title || dept.label || dept.code || dept._id || "").trim(),
      }))
    : departments;

  useEffect(() => {
    if (!departmentOptions.some((dept) => dept.key === selectedDepartment) && departmentOptions.length) {
      setSelectedDepartment(departmentOptions[0].key);
    }
  }, [departmentOptions, selectedDepartment]);

  const selectedDeptMeta = departmentOptions.find((dept) => dept.key === selectedDepartment) || departmentOptions[0];
  const departmentStudents = students.filter((student) => getNormalizedDepartment(student.department, departmentsMeta) === selectedDepartment);

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 20, background: "#050505", color: "#f8fafc" }}>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.24em", color: "#94a3b8", fontWeight: 700 }}>Department View</p>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>Department-wise Student List</h3>
            <p style={{ color: "#cbd5e1", marginTop: 6, maxWidth: 680 }}>
             
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#f8fafc", fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
            <Users size={16} />
            <span>{departmentStudents.length} students</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {departmentOptions.map((dept) => {
            const isActive = selectedDepartment === dept.key;
            return (
              <button
                key={dept.key}
                type="button"
                onClick={() => setSelectedDepartment(dept.key)}
                style={{
                  border: isActive ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.1)",
                  background: isActive ? "linear-gradient(135deg, #111827, #1f2937)" : "rgba(255,255,255,0.06)",
                  color: isActive ? "#f8fafc" : "#e2e8f0",
                  padding: "10px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontWeight: 700,
                  boxShadow: isActive ? "0 12px 28px rgba(99,102,241,0.18)" : "none",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{ marginRight: 6 }}>{dept.label}</span>
                <span style={{ opacity: 0.8, fontSize: 12 }}>{dept.title}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 10, maxWidth: 360 }}>
          <div className="label">Academic Year</div>
          <select
            className="input"
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {academicYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, background: "#0b0f19", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>{selectedDeptMeta.title}</h3>
            <p style={{ color: "#94a3b8", marginTop: 4 }}>
              Showing {filteredStudents.length} of {departmentStudents.length} students
            </p>
          </div>
          <div style={{ position: "relative", minWidth: 280 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              className="input"
              style={{ paddingLeft: 36, width: "100%", background: "#111827", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.12)" }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or roll number"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8" }}>Loading students…</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ border: "1px dashed rgba(255,255,255,0.16)", borderRadius: 16, padding: 28, textAlign: "center", color: "#94a3b8", background: "rgba(255,255,255,0.03)" }}>
            <GraduationCap size={28} style={{ margin: "0 auto 10px", color: "#f8fafc" }} />
            <p style={{ fontWeight: 600, color: "#f8fafc" }}>No students found in this department.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            {filteredStudents.map((student) => {
              const attendance = student.attendancePercentage ?? student.attendance?.percentage ?? null;
              return (
                <div key={student._id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}>Roll Number</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>{student.rollNo || "—"}</p>
                    </div>
                    {attendance !== null && (
                      <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#059669", fontWeight: 700, fontSize: 12 }}>
                        {attendance}%
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc" }}>{student.name || "Unnamed Student"}</h4>
                    <div style={{ marginTop: 10, display: "grid", gap: 8, color: "#cbd5e1", fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Department</span>
                        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{getDepartmentLabel(student.department, departmentsMeta) || selectedDeptMeta.title}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Year</span>
                        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{student.year || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Academic Year</span>
                        <span style={{ color: "#f8fafc", fontWeight: 600 }}>{getAcademicYearLabel(student) || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Email</span>
                        <span style={{ color: "#f8fafc", fontWeight: 600, textAlign: "right" }}>{student.email || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
