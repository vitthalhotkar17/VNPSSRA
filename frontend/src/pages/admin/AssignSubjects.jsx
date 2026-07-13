import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiUsers, FiBookOpen, FiSave } from "react-icons/fi";
import { assignmentService } from "../../services/assignmentService.js";
import { subjectService } from "../../services/subjectService.js";
import { api } from "../../services/api.js";
import toast from "react-hot-toast";

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const extractDepartmentValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.code || value.name || value.department || value.title || value.label || value._id || String(value || "");
};

const canonicalDepartmentCode = (value) => {
  const normalized = normalizeText(extractDepartmentValue(value));
  if (["co", "computer engineering", "computer", "computer engg", "computer science", "cse"].includes(normalized)) return "CO";
  if (["ej", "electronics & telecommunication", "electronics and telecommunication", "electronics and telecom", "entc", "electronics"].includes(normalized)) return "EJ";
  if (["civil", "civil engineering"].includes(normalized)) return "Civil";
  if (["mk", "mechanical engineering", "mechanical", "mechanical engg"].includes(normalized)) return "MK";
  return normalized;
};

const resolveDepartmentMeta = (value, departments = []) => {
  if (!value) return null;
  const raw = extractDepartmentValue(value);
  const normalizedRaw = normalizeText(raw);

  const byId = departments.find((dept) => String(dept._id) === String(raw));
  if (byId) return byId;

  const byCode = departments.find((dept) => normalizeText(dept.code) === normalizedRaw);
  if (byCode) return byCode;

  const byName = departments.find((dept) => normalizeText(dept.name) === normalizedRaw);
  if (byName) return byName;

  return null;
};

const resolveDepartmentCode = (value, departments = []) => {
  const meta = resolveDepartmentMeta(value, departments);
  if (meta) {
    return canonicalDepartmentCode(meta.code || meta.name || meta.department || meta._id || meta.title || meta.label);
  }
  return canonicalDepartmentCode(value);
};

const isObjectIdString = (value) => {
  const raw = String(value || "").trim();
  return /^[0-9a-fA-F]{24}$/.test(raw);
};

const departmentMatches = (value, filter, departments = []) => {
  if (!filter) return true;
  const filterKey = resolveDepartmentCode(filter, departments);
  const valueKey = resolveDepartmentCode(value, departments);
  if (valueKey && filterKey && valueKey === filterKey) return true;

  const rawFilter = normalizeText(extractDepartmentValue(filter));
  const rawValue = normalizeText(extractDepartmentValue(value));
  if (rawFilter && rawValue && rawFilter === rawValue) return true;

  const filterMeta = resolveDepartmentMeta(filter, departments);
  const valueMeta = resolveDepartmentMeta(value, departments);
  if (filterMeta && valueMeta) {
    return String(filterMeta._id) === String(valueMeta._id);
  }

  if (filterMeta) {
    return rawValue === normalizeText(filterMeta.code || filterMeta.name || String(filterMeta._id));
  }

  return false;
};

const resolveDepartmentLabel = (value, departments = []) => {
  const meta = resolveDepartmentMeta(value, departments);
  if (meta) {
    if (meta.code && meta.name) return `${meta.code} — ${meta.name}`;
    return meta.code || meta.name || String(meta._id);
  }

  const raw = extractDepartmentValue(value);
  return raw;
};

export default function AssignSubjects() {
  const [facultyList, setFacultyList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadDepartments = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data.data?.departments || []);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: fData }, subjects, assignmentList] = await Promise.all([
          api.get("/admin/faculty"),
          subjectService.getAll(),
          assignmentService.getAll(),
        ]);
        const faculty = fData.data?.faculty || [];

        setFacultyList(faculty);
        setSubjectList(subjects);
        setAssignments(assignmentList || []);

        await loadDepartments();

        if (faculty.length) {
          const first = faculty[0];
          setSelectedFaculty(first);
          const subs = await assignmentService.getSubjectsForFaculty(first._id);
          setSelectedSubjects(subs);
        }
      } catch (err) { toast.error(err.message); }
    };

    load();
    const onFocus = () => loadDepartments();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleFacultySelect = async (faculty) => {
    setSelectedFaculty(faculty);
    try {
      const subs = await assignmentService.getSubjectsForFaculty(faculty._id);
      setSelectedSubjects(subs);
    } catch { setSelectedSubjects([]); }
  };

  const departmentOptions = useMemo(() => {
    const seen = new Map();

    departments.forEach((dept) => {
      const code = resolveDepartmentCode(dept, departments);
      if (!code) return;
      const label = resolveDepartmentLabel(dept, departments) || code;
      if (!seen.has(code)) {
        seen.set(code, { value: code, label });
      }
    });

    if (seen.size === 0) {
      facultyList.forEach((faculty) => {
        const code = resolveDepartmentCode(faculty.department, departments);
        if (!code || isObjectIdString(code) || seen.has(code)) return;
        seen.set(code, { value: code, label: resolveDepartmentLabel(faculty.department, departments) || code });
      });

      subjectList.forEach((subject) => {
        const code = resolveDepartmentCode(subject.department, departments);
        if (!code || isObjectIdString(code) || seen.has(code)) return;
        seen.set(code, { value: code, label: resolveDepartmentLabel(subject.department, departments) || code });
      });
    }

    return Array.from(seen.values());
  }, [departments, facultyList, subjectList]);

  const visibleFaculty = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    return facultyList.filter((faculty) => {
      const matchesDepartment = !departmentFilter || departmentMatches(faculty.department, departmentFilter, departments);
      const matchesSearch = !normalizedSearch || normalizeText(faculty.name).includes(normalizedSearch);
      return matchesDepartment && matchesSearch;
    });
  }, [facultyList, departmentFilter, departments, searchTerm]);

  const visibleSubjects = useMemo(() => {
    if (!departmentFilter) return subjectList;
    return subjectList.filter((subject) => departmentMatches(subject.department, departmentFilter, departments));
  }, [subjectList, departmentFilter, departments]);

  useEffect(() => {
    if (!selectedFaculty) return;
    if (departmentFilter && !visibleFaculty.some((f) => f._id === selectedFaculty._id)) {
      if (visibleFaculty.length) {
        handleFacultySelect(visibleFaculty[0]);
      } else {
        setSelectedFaculty(null);
        setSelectedSubjects([]);
      }
    }
  }, [departmentFilter, selectedFaculty, visibleFaculty]);

  const assignedToOtherFaculty = useMemo(() => {
    const assigned = new Set();
    assignments.forEach((assignment) => {
      const facultyId = assignment.facultyId?._id || assignment.facultyId;
      if (facultyId && facultyId !== selectedFaculty?._id) {
        (assignment.subjects || []).forEach((subject) => assigned.add(subject));
      }
    });
    return assigned;
  }, [assignments, selectedFaculty?._id]);

  const toggleSubject = (subjectName) => {
    if (assignedToOtherFaculty.has(subjectName) && !selectedSubjects.includes(subjectName)) {
      toast.error("This subject is already assigned to another faculty.");
      return;
    }

    setSelectedSubjects((prev) =>
      prev.includes(subjectName)
        ? prev.filter((s) => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const removeSubject = (subjectName) => {
    setSelectedSubjects((prev) => prev.filter((subject) => subject !== subjectName));
  };

  const handleSave = async () => {
    if (!selectedFaculty) return;
    const conflictingSelected = selectedSubjects.filter((subject) => assignedToOtherFaculty.has(subject));
    if (conflictingSelected.length) {
      toast.error(`These subjects are already assigned to another faculty: ${conflictingSelected.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      await assignmentService.saveForFaculty(selectedFaculty._id, selectedSubjects);
      const refreshedAssignments = await assignmentService.getAll();
      setAssignments(refreshedAssignments || []);
      toast.success("Subjects assigned successfully.");
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="card p-6 bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-soft hero-gradient">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-200">Admin Panel</p>
            <h2 className="mt-2 text-3xl font-semibold">Assign Subjects to Faculty</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-100/90">Select a faculty member and assign subjects from the database.</p>
          </div>
          {selectedFaculty && (
            <div className="rounded-3xl bg-white/10 p-4 text-sm text-slate-100">
              <div className="font-semibold">Assigned Faculty</div>
              <div className="mt-2 text-lg">{selectedFaculty.name}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          {/* Faculty list */}
          <div className="card p-5">
            <div className="flex items-center gap-3 text-brand-700 mb-4" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiUsers size={20} />
                <h3 className="font-semibold text-slate-900">Select Faculty</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label className="label" style={{ marginBottom: 0 }}>Search</label>
                <input
                  className="input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search faculty..."
                  style={{ minWidth: 220 }}
                />
                <label className="label" style={{ marginBottom: 0 }}>Department</label>
                <select
                  className="input"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{ minWidth: 180 }}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {visibleFaculty.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No faculty found for this department.</p>}
              {visibleFaculty.map((f) => (
                <button key={f._id}
                  onClick={() => handleFacultySelect(f)}
                  style={{
                    background: selectedFaculty?._id === f._id ? "rgba(99,102,241,0.1)" : "var(--surface2)",
                    border: selectedFaculty?._id === f._id ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border2)",
                    borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>{f.name}</p>
                    <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{resolveDepartmentLabel(f.department, departments)}</p>
                  </div>
                  {selectedFaculty?._id === f._id && <FiCheckCircle color="#818cf8" />}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3 text-brand-700">
              <FiBookOpen size={18} />
              <p className="font-semibold text-slate-900">Assignment Summary</p>
            </div>
            <div style={{ borderRadius: 16, border: "1px solid var(--border2)", background: "var(--surface2)", padding: 16 }}>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Faculty</p>
              <p style={{ fontWeight: 600, color: "var(--text)", marginTop: 2 }}>{selectedFaculty?.name || "None selected"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSubjects.length === 0
                  ? <span className="chip chip-muted">No subjects selected</span>
                  : selectedSubjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => removeSubject(s)}
                        className="chip chip-blue flex items-center gap-1"
                      >
                        <span>{s}</span>
                        <span className="text-[11px]">×</span>
                      </button>
                    ))}
              </div>
            </div>
            <button onClick={handleSave} className="btn btn-primary w-full" disabled={saving || !selectedFaculty}>
              <FiSave /> {saving ? "Saving…" : "Save Assignment"}
            </button>
          </div>
        </div>

        {/* Subject picker */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4" style={{ color: "var(--text)" }}>Select Subjects</h3>
          {visibleSubjects.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>No subjects found for this department.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
              {visibleSubjects.map((s) => {
                const checked = selectedSubjects.includes(s.name);
                const disabled = assignedToOtherFaculty.has(s.name) && !checked;
                return (
                  <button key={s._id} onClick={() => toggleSubject(s.name)}
                    disabled={disabled}
                    style={{
                      background: checked ? "rgba(99,102,241,0.1)" : "var(--surface2)",
                      border: checked ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border2)",
                      borderRadius: 12, padding: "14px 16px", cursor: disabled ? "not-allowed" : "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s", opacity: disabled ? 0.6 : 1
                    }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: checked ? "2px solid #818cf8" : "2px solid var(--border2)", background: checked ? "#818cf8" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {checked && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: checked ? "#818cf8" : "var(--text)" }}>{s.name}</p>
                      {s.code && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{s.code}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4 card p-4" style={{ background: "var(--surface2)" }}>
            <div className="flex items-center gap-3">
              <FiCheckCircle size={18} className="text-emerald-400" />
              <div>
                <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Assignment Rules</p>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Select subjects from the database. Changes are saved instantly when you click Save Assignment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
