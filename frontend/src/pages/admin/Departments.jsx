import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";
import { Plus, Trash2, Edit2, X, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

const emptyForm = { name: "", code: "", description: "", status: "Active" };

export default function AdminDepartments() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/departments");
      setList(data.data?.departments || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/departments", form);
      toast.success("Department created");
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    setLoading(true);
    try {
      await api.put(`/departments/${editing._id}`, editing);
      toast.success("Department updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this department?")) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    return list.filter((item) => [item.name, item.code, item.description].join(" ").toLowerCase().includes(term));
  }, [list, query]);

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 480, padding: 28, position: "relative" }}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Edit Department</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="label">Department Name</div>
                <input className="input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <div className="label">Department Code</div>
                <input className="input" value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </div>
              <div>
                <div className="label">Status</div>
                <select className="input" value={editing.status || "Active"} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="label">Description</div>
                <textarea className="input" rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={loading}><Check size={14} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
        <form onSubmit={add} className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Add Department</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="label">Department Name</div>
              <input required className="input" placeholder="Department Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <div className="label">Department Code</div>
              <input required className="input" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <div className="label">Status</div>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <div className="label">Description</div>
              <textarea className="input" rows={3} placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              <Plus size={15} /> {loading ? "Saving…" : "Add Department"}
            </button>
          </div>
        </form>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              All Departments <span style={{ color: "var(--muted)", fontWeight: 400 }}>({filtered.length})</span>
            </h3>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input className="input" style={{ paddingLeft: 34, width: 220 }} placeholder="Search departments" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table-base" style={{ width: "100%" }}>
              <thead>
                <tr><th>Name</th><th>Code</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>No departments found</td></tr>
                )}
                {filtered.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{dept.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{dept.description || "No description"}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{dept.code}</td>
                    <td><span className={`chip ${dept.status === "Active" ? "chip-green" : "chip-amber"}`}>{dept.status}</span></td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(dept.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditing(dept)} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", cursor: "pointer" }}><Edit2 size={13} /></button>
                        <button onClick={() => remove(dept._id)} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f87171", cursor: "pointer" }}><Trash2 size={13} /></button>
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
