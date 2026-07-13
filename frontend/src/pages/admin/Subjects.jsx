import { useEffect, useState } from "react";
import { subjectService } from "../../services/subjectService.js";
import { api } from "../../services/api.js";
import { BookOpen, Plus, Trash2, Edit2, X, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

const emptyForm = { name: "", code: "", department: "", year: "" };

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [q, setQ]               = useState("");

  const load = async () => {
    try {
      const [list, deptRes] = await Promise.all([
        subjectService.getAll(),
        api.get("/departments"),
      ]);
      setSubjects(list);
      setDepartments(deptRes.data?.data?.departments || []);
    } catch (err) { toast.error(err.message); }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Subject name is required");
    setLoading(true);
    try {
      await subjectService.create(form);
      toast.success("Subject created");
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const saveEdit = async () => {
    setLoading(true);
    try {
      await subjectService.update(editing._id, { name: editing.name, code: editing.code, department: editing.department, year: editing.year });
      toast.success("Subject updated");
      setEditing(null);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this subject?")) return;
    try {
      await subjectService.delete(id);
      toast.success("Subject deleted");
      load();
    } catch (err) { toast.error(err.message); }
  };

  const filtered = subjects.filter((s) =>
    (String(s.name || "") + String(s.code || "") + String(s.department || "") + String(s.year || "")).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Edit Modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 420, padding: 28, position: "relative" }}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Edit Subject</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["name","Subject Name"],["code","Subject Code"].map(([field, label]) => (
                <div key={field}>
                  <div className="label">{label}</div>
                  <input className="input" value={editing[field] || ""} onChange={(e) => setEditing({...editing, [field]: e.target.value})} />
                </div>
              ))}
              <div>
                <div className="label">Department</div>
                <select className="input" value={editing.department || ""} onChange={(e) => setEditing({...editing, department: e.target.value})}>
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name || dept.code || dept._id}>
                      {dept.code ? `${dept.code} — ${dept.name}` : dept.name || dept.code || dept._id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Year</div>
                <select className="input" value={editing.year || ""} onChange={(e) => setEditing({...editing, year: e.target.value})}>
                  <option value="">Select year</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={loading}><Check size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="hero-gradient" style={{ padding: "28px 32px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Admin · Subject Management</p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Manage Subjects</h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>Add, edit, and delete subjects. All data is stored in the database.</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Subjects</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginTop: 4 }}>{subjects.length}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
        {/* Add form */}
        <form onSubmit={add} className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center" }}>
              <BookOpen size={18} color="#818cf8" />
            </div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Add New Subject</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="label">Subject Name *</div>
              <input required className="input" placeholder="e.g. Data Structures" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <div className="label">Subject Code</div>
              <input className="input" placeholder="e.g. CS301" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} />
            </div>
            <div>
              <div className="label">Department</div>
              <select className="input" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name || dept.code || dept._id}>
                    {dept.code ? `${dept.code} — ${dept.name}` : dept.name || dept.code || dept._id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Year</div>
              <select className="input" value={form.year} onChange={(e) => setForm({...form, year: e.target.value})}>
                <option value="">Select year</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              <Plus size={15} /> {loading ? "Adding…" : "Add Subject"}
            </button>
          </div>
        </form>

        {/* Subject list */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              All Subjects <span style={{ color: "var(--muted)", fontWeight: 400 }}>({filtered.length})</span>
            </h3>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input className="input" style={{ paddingLeft: 34, width: 200 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              {subjects.length === 0 ? "No subjects yet. Add your first subject!" : "No subjects match your search."}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
              {filtered.map((s) => (
                <div key={s._id} className="card" style={{ padding: 18, background: "var(--surface2)", border: "1px solid var(--border2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <BookOpen size={16} color="#818cf8" />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditing(s)} style={{ padding: "5px 7px", borderRadius: 7, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", cursor: "pointer" }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => remove(s._id)} style={{ padding: "5px 7px", borderRadius: 7, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{s.name}</p>
                  {s.code && <p style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 2 }}>Code: <span style={{ color: "#818cf8" }}>{s.code}</span></p>}
                  {s.department && <p style={{ fontSize: 11.5, color: "var(--muted)" }}>Dept: {s.department}</p>}
                  {s.year && <p style={{ fontSize: 11.5, color: "var(--muted)" }}>Year: {s.year}</p>}
                  <div style={{ marginTop: 10 }}>
                    <span className="chip chip-green">Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
