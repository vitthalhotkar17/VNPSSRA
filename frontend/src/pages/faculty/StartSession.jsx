import { useState, useEffect } from "react";
import { assignmentService } from "../../services/assignmentService.js";
import { attendanceService } from "../../services/attendanceService.js";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { PlayCircle, StopCircle, MapPin, BookOpen, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getCurrentLocation } from "../../utils/geolocation.js";

const resolveDepartmentId = (department, departments = []) => {
  if (!department) return "";
  if (typeof department === "string") {
    const normalized = department.trim();
    const matched = departments.find((dept) => String(dept._id) === normalized || dept.code === normalized || dept.name === normalized);
    return matched ? String(matched._id) : normalized;
  }

  const id = department._id || department.id;
  if (id) return String(id);

  const raw = department.code || department.name || department.department || "";
  const normalized = String(raw).trim();
  const matched = departments.find((dept) => dept.code === normalized || dept.name === normalized);
  return matched ? String(matched._id) : normalized;
};

export default function StartSession() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [session, setSession]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [subs, active, deptData] = await Promise.all([
          assignmentService.getSubjectsForFaculty(user._id || user.id),
          attendanceService.getActiveSession(),
          api.get("/departments"),
        ]);

        const loadedDepartments = deptData.data?.data?.departments || [];
        setSubjects(subs);
        setDepartments(loadedDepartments);

        if (active && (active.facultyId === (user._id || user.id) || active.facultyId?._id === (user._id || user.id))) {
          setSession(active);
          setSelected(active.subject);
          setSelectedYear(active.academicYear);
          setSelectedDepartment(resolveDepartmentId(active.department || user.department, loadedDepartments));
        } else if (user?.department) {
          setSelectedDepartment(resolveDepartmentId(user.department, loadedDepartments));
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setChecking(false);
      }
    };
    if (user) load();
  }, [user]);

  const handleStart = async () => {
    if (!selected) { toast.error("Please select a subject."); return; }
    if (!selectedYear) { toast.error("Please select an academic year."); return; }
    if (!selectedDepartment) { toast.error("Please select a department."); return; }
    setLoading(true);
    try {
      const existing = await attendanceService.getActiveSession(selectedYear, selectedDepartment);
      if (existing) {
        toast.error("A session is already active for this academic year in this department. Stop it first.");
        return;
      }
      const pos = await getCurrentLocation({ timeout: 15000 });
      const s = await attendanceService.startSession({ subject: selected, academicYear: selectedYear, department: selectedDepartment, lat: pos.lat, lng: pos.lng });
      setSession(s);
      toast.success("Session started — students can now mark attendance!");
    } catch (err) { toast.error(err?.message || "Failed to start session"); }
    finally { setLoading(false); }
  };

  const handleStop = async () => {
    if (!session?._id) return;
    setLoading(true);
    try {
      await attendanceService.stopSession(session._id);
      toast.success("Session stopped.");
      setSession(null);
      setSelected("");
    } catch (err) { toast.error(err?.message || "Failed to stop session"); }
    finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 700 }}>
      {/* Hero */}
      <div className="hero-gradient" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Faculty · Session Control</p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Start Attendance Session</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>Your GPS location is captured when you start. Students must be within 500 m.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Subject selector */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center" }}>
              <BookOpen size={18} color="#818cf8" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Select Subject</p>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Your assigned subjects (from database)</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checking ? (
              <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Loading subjects…</p>
            ) : subjects.length > 0 ? subjects.map((s) => (
              <div key={s} onClick={() => !session && setSelected(s)}
                style={{
                  background: selected === s ? "rgba(99,102,241,0.1)" : "var(--surface2)",
                  border: selected === s ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                  borderRadius: 10, padding: "12px 16px", cursor: session ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s"
                }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: selected === s ? "#818cf8" : "var(--text)" }}>{s}</span>
                {selected === s && <CheckCircle size={16} color="#818cf8" />}
              </div>
            )) : (
              <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>No subjects assigned. Contact admin.</p>
            )}
          </div>
        </div>

        {/* Session control */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Academic Year Selector */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(168,85,247,0.12)", display: "grid", placeItems: "center" }}>
                <BookOpen size={18} color="#a855f7" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Select Academic Year</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Years you can manage</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {user?.assignedYears && user.assignedYears.length > 0 ? user.assignedYears.map((year) => (
                <div key={year} onClick={() => !session && setSelectedYear(year)}
                  style={{
                    background: selectedYear === year ? "rgba(168,85,247,0.1)" : "var(--surface2)",
                    border: selectedYear === year ? "1px solid rgba(168,85,247,0.4)" : "1px solid var(--border)",
                    borderRadius: 10, padding: "12px 16px", cursor: session ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s"
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: selectedYear === year ? "#a855f7" : "var(--text)" }}>{year}</span>
                  {selectedYear === year && <CheckCircle size={16} color="#a855f7" />}
                </div>
              )) : (
                <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>No academic years assigned. Contact admin.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(96,165,250,0.12)", display: "grid", placeItems: "center" }}>
                <MapPin size={18} color="#3b82f6" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Select Department</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Choose the department for this session</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {departments.length > 0 ? departments.map((dept) => (
                <div key={dept._id} onClick={() => !session && setSelectedDepartment(dept._id)}
                  style={{
                    background: selectedDepartment === dept._id ? "rgba(59,130,246,0.1)" : "var(--surface2)",
                    border: selectedDepartment === dept._id ? "1px solid rgba(59,130,246,0.4)" : "1px solid var(--border)",
                    borderRadius: 10, padding: "12px 16px", cursor: session ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.15s"
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: selectedDepartment === dept._id ? "#3b82f6" : "var(--text)" }}>{dept.code ? `${dept.code} — ${dept.name}` : dept.name}</span>
                  {selectedDepartment === dept._id && <CheckCircle size={16} color="#3b82f6" />}
                </div>
              )) : (
                <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Loading departments…</p>
              )}
            </div>
          </div>

          {/* Action card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(16,185,129,0.1)", display: "grid", placeItems: "center" }}>
                <MapPin size={18} color="#10b981" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Session Control</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>GPS auto-captured on start</p>
              </div>
            </div>

            {!session ? (
              <button className="btn btn-primary w-full" style={{ justifyContent: "center", padding: "12px" }} disabled={loading || !selected || !selectedYear || !selectedDepartment} onClick={handleStart}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Starting…</> : <><PlayCircle size={16} /> Start Session</>}
              </button>
            ) : (
              <button className="btn btn-danger w-full" style={{ justifyContent: "center", padding: "12px" }} disabled={loading} onClick={handleStop}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Stopping…</> : <><StopCircle size={16} /> Stop Session</>}
              </button>
            )}
          </div>

          {/* Active session info */}
          {session && (
            <div className="animate-fade-in" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="dot-live" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Session Active</span>
              </div>
              {[
                { label: "Academic Year", val: session.academicYear },
                { label: "Subject",       val: session.subject },
                { label: "Department",    val: departments.find((d) => String(d._id) === String(session.department))?.code || session.department || "—" },
                { label: "Session ID",    val: session._id },
                { label: "Expires",       val: new Date(session.expiresAt).toLocaleTimeString() },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--muted)" }}>{label}</span>
                  <span style={{ color: "var(--text)", fontWeight: 600, fontFamily: label === "Session ID" ? "monospace" : "inherit", fontSize: label === "Session ID" ? 11 : 12.5 }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
