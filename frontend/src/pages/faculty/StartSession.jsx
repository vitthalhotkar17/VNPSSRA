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

const resolveSubjectId = (subject) => {
  if (!subject) return "";
  if (typeof subject === "string") return subject;
  return String(subject._id || subject.id || "");
};

const resolveSubjectLabel = (subject) => {
  if (!subject) return "";
  if (typeof subject === "string") return subject;
  if (subject.code && subject.name) return `${subject.code} — ${subject.name}`;
  return subject.name || subject.code || String(subject._id || subject.id || "");
};

export default function StartSession() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

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
          setSelected(resolveSubjectId(active.subject));
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
    if (!selected) {
      toast.error("Please select a subject.");
      return;
    }
    if (!selectedYear) {
      toast.error("Please select an academic year.");
      return;
    }
    if (!selectedDepartment) {
      toast.error("Please select a department.");
      return;
    }

    setLoading(true);
    setGpsAccuracy(null);

    try {
      const existing = await attendanceService.getActiveSession(selectedYear, selectedDepartment);
      if (existing) {
        toast.error("A session is already active for this academic year in this department. Please stop it first.");
        return;
      }

      const pos = await getCurrentLocation({
        sampleWindowMs: 8000,
        minAccuracy: 50,
        fallbackToIp: false,
        onSample: (reading) => setGpsAccuracy(reading.accuracy),
      });

      const s = await attendanceService.startSession({
        subject: selected,
        academicYear: selectedYear,
        department: selectedDepartment,
        lat: pos.lat,
        lng: pos.lng,
      });

      setSession(s);
      toast.success(`Session started successfully! Location accuracy: ~${Math.round(pos.accuracy)}m — Students can now mark attendance.`);
    } catch (err) {
      toast.error(err?.message || "Failed to start session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!session?._id) {
      toast.error("No active session to stop.");
      return;
    }

    setLoading(true);
    try {
      await attendanceService.stopSession(session._id);
      toast.success("Session stopped successfully.");
      setSession(null);
      setSelected("");
    } catch (err) {
      toast.error(err?.message || "Failed to stop session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 700, margin: "0 auto", padding: "20px" }}>
      {/* Hero Section */}
      <div className="hero-gradient" style={{ padding: "28px 32px", marginBottom: 24, borderRadius: 12 }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
            Faculty · Session Control
          </p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            Start Attendance Session
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
            Your GPS location is captured when you start. Students must be within 500 meters.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left Column - Subject Selector */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center" }}>
              <BookOpen size={18} color="#818cf8" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Select Subject</p>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Your assigned subjects from database</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {checking ? (
              <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>Loading subjects…</p>
            ) : subjects.length > 0 ? (
              subjects.map((s) => {
                const subjectId = resolveSubjectId(s);
                const subjectLabel = resolveSubjectLabel(s);
                const isSelected = selected === subjectId;

                return (
                  <div
                    key={subjectId}
                    onClick={() => !session && setSelected(subjectId)}
                    style={{
                      background: isSelected ? "rgba(99,102,241,0.1)" : "var(--surface2)",
                      border: isSelected ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      cursor: session ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                      opacity: session ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? "#818cf8" : "var(--text)" }}>
                      {subjectLabel}
                    </span>
                    {isSelected && <CheckCircle size={16} color="#818cf8" />}
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
                No subjects assigned. Please contact your administrator.
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Academic Year Selector */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(168,85,247,0.12)", display: "grid", placeItems: "center" }}>
                <BookOpen size={18} color="#a855f7" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Academic Year</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Select the academic year</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {user?.assignedYears && user.assignedYears.length > 0 ? (
                user.assignedYears.map((year) => {
                  const isSelected = selectedYear === year;
                  return (
                    <div
                      key={year}
                      onClick={() => !session && setSelectedYear(year)}
                      style={{
                        background: isSelected ? "rgba(168,85,247,0.1)" : "var(--surface2)",
                        border: isSelected ? "1px solid rgba(168,85,247,0.4)" : "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "12px 16px",
                        cursor: session ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                        opacity: session ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? "#a855f7" : "var(--text)" }}>
                        {year}
                      </span>
                      {isSelected && <CheckCircle size={16} color="#a855f7" />}
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
                  No academic years assigned. Please contact your administrator.
                </p>
              )}
            </div>
          </div>

          {/* Department Selector */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(59,130,246,0.12)", display: "grid", placeItems: "center" }}>
                <MapPin size={18} color="#3b82f6" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Department</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Choose the department for this session</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {departments.length > 0 ? (
                departments.map((dept) => {
                  const isSelected = selectedDepartment === dept._id;
                  return (
                    <div
                      key={dept._id}
                      onClick={() => !session && setSelectedDepartment(dept._id)}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.1)" : "var(--surface2)",
                        border: isSelected ? "1px solid rgba(59,130,246,0.4)" : "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "12px 16px",
                        cursor: session ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                        opacity: session ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? "#3b82f6" : "var(--text)" }}>
                        {dept.code ? `${dept.code} — ${dept.name}` : dept.name}
                      </span>
                      {isSelected && <CheckCircle size={16} color="#3b82f6" />}
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
                  Loading departments…
                </p>
              )}
            </div>
          </div>

          {/* Session Control */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(16,185,129,0.1)", display: "grid", placeItems: "center" }}>
                <PlayCircle size={18} color="#10b981" />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Session Control</p>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>
                  {session ? "Session is currently active" : "GPS captured automatically on start"}
                </p>
              </div>
            </div>

            {!session ? (
              <>
                <button
                  className="btn btn-primary w-full"
                  style={{ justifyContent: "center", padding: "12px 16px" }}
                  disabled={loading || !selected || !selectedYear || !selectedDepartment}
                  onClick={handleStart}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" style={{ marginRight: 8 }} />
                      Starting…
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} style={{ marginRight: 8 }} />
                      Start Session
                    </>
                  )}
                </button>

                {loading && (
                  <p style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                    {gpsAccuracy !== null
                      ? `Locking classroom location — accuracy: ${Math.round(gpsAccuracy)}m`
                      : "Searching for GPS signal…"}
                  </p>
                )}

                {!loading && (selected && selectedYear && selectedDepartment) && (
                  <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
                    ✓ Ready to start session
                  </p>
                )}
              </>
            ) : (
              <>
                <button
                  className="btn btn-danger w-full"
                  style={{ justifyContent: "center", padding: "12px 16px" }}
                  disabled={loading}
                  onClick={handleStop}
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" style={{ marginRight: 8 }} />
                      Stopping…
                    </>
                  ) : (
                    <>
                      <StopCircle size={16} style={{ marginRight: 8 }} />
                      Stop Session
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Active Session Information */}
          {session && (
            <div
              className="card"
              style={{
                padding: 24,
                background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: "rgba(16,185,129,0.15)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <CheckCircle size={18} color="#10b981" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Active Session Details</p>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>
                    Started at {session.createdAt ? new Date(session.createdAt).toLocaleTimeString() : "N/A"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Subject</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {session.subject?.name || session.subject || "N/A"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Academic Year</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {session.academicYear || "N/A"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Department</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {session.department?.name || session.department || "N/A"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>📍 Location</span>
                  <span style={{ fontSize: 12, color: "var(--text)" }}>
                    {session.lat?.toFixed(6)}, {session.lng?.toFixed(6)}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Students Marked</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>
                    {session.attendanceCount || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
