import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";
import { Plus, Trash2, Edit2, X, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const emptyForm = { name: "", email: "", department: "", employeeId: "", contact: "", password: "faculty123", assignedYears: [] };

const academicYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];

// FIX: robust id-based lookup — always coerce ids to strings before comparing,
// since Mongo ObjectIds / populated objects / plain id strings can otherwise
// fail a strict comparison and make the department "disappear" from the table
// or make filtering by a specific department return nothing.
const getDepartmentDisplayName = (department, departmentList = []) => {
  if (!department) return "—";

  if (typeof department === "string") {
    const match = departmentList.find((item) => String(item._id) === String(department));
    return match?.name || department;
  }

  if (typeof department === "object") {
    if (department.name) return department.name;
    if (department.departmentName) return department.departmentName;
    if (department.title) return department.title;
    if (department.label) return department.label;

    if (department._id) {
      const match = departmentList.find((item) => String(item._id) === String(department._id));
      return match?.name || String(department._id);
    }
  }

  return String(department);
};

// FIX: the real bug — faculty.department in your data is sometimes stored as a
// plain text code ("CO", "co", "EJ", "Mech") instead of the department's _id.
// Filtering by _id (what the dropdown value is) against that text can never
// match on the backend, so selecting a department silently returns 0 results.
// This helper matches loosely and case-insensitively against BOTH the raw
// stored value and the resolved department name, so it works whether a given
// faculty record has a proper id reference or legacy free-text.
const departmentMatches = (facultyDepartment, selectedDeptId, departmentList = []) => {
  if (!selectedDeptId) return true; // "All Departments"
  if (!facultyDepartment) return false;

  const selectedDept = departmentList.find((d) => String(d._id) === String(selectedDeptId));
  const selectedName = selectedDept?.name?.toLowerCase();

  const rawValue =
    typeof facultyDepartment === "string"
      ? facultyDepartment
      : facultyDepartment?._id || facultyDepartment?.name || "";
  const resolvedName = getDepartmentDisplayName(facultyDepartment, departmentList);

  return (
    String(rawValue).toLowerCase() === String(selectedDeptId).toLowerCase() ||
    String(rawValue).toLowerCase() === selectedName ||
    String(resolvedName).toLowerCase() === selectedName
  );
};

export default function AdminFaculty() {
  const [list, setList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // FIX: dedupe using a stringified id consistently, and store the id itself
  // stringified on the object so <option value> and the filter param always match.
  const uniqueDepartments = useMemo(() => {
    const seen = new Map();
    departments.forEach((dept) => {
      if (dept && dept._id) {
        const id = String(dept._id);
        seen.set(id, { ...dept, _id: id });
      }
    });
    return Array.from(seen.values());
  }, [departments]);

  // FIX: apply the department filter on the client against the already-fetched
  // page of results, since the backend can't reliably filter on the stored data.
  const displayedList = useMemo(
    () => list.filter((u) => departmentMatches(u.department, departmentFilter, departments)),
    [list, departmentFilter, departments]
  );

  const load = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      // NOTE: department is intentionally NOT sent to the backend here.
      // Faculty records store department as inconsistent free text ("CO", "co", etc.)
      // rather than a reliable _id reference, so a server-side id match returns
      // nothing. We fetch normally and filter by department on the client instead
      // (see departmentMatches / the useMemo below).
      if (filters.search) params.set("search", filters.search);
      if (filters.page) params.set("page", filters.page);
      if (filters.limit) params.set("limit", filters.limit);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      const url = `/faculty?${params.toString()}`;
      console.debug("[AdminFaculty] loading faculty with:", url);
      const { data } = await api.get(url);
      console.debug("[AdminFaculty] received", data.data?.faculty?.length, "faculty items");
      setList(data.data?.faculty || []);
      setPagination(data.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) { toast.error(err.message); }
  };

  const loadDepartments = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data.data?.departments || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadDepartments(); }, []);

  // FIX: department is no longer part of this effect's deps — switching the
  // dropdown now just re-filters the already-loaded page instantly via
  // displayedList, instead of triggering a server request that returns nothing.
  useEffect(() => {
    load({ search: query, page, sortBy, sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortOrder]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    load({ search: query, page: 1, sortBy, sortOrder });
  };

  const add = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/faculty", form);
      toast.success("Faculty added");
      setForm(emptyForm);
      load({ search: query, page, sortBy, sortOrder });
      loadDepartments();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const saveEdit = async () => {
    setLoading(true);
    try {
      await api.put(`/faculty/${editing._id}`, editing);
      toast.success("Faculty updated");
      setEditing(null);
      load({ search: query, page, sortBy, sortOrder });
      loadDepartments();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this faculty member?")) return;
    try {
      await api.delete(`/faculty/${id}`);
      toast.success("Deleted");
      load({ search: query, page, sortBy, sortOrder });
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Edit modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div className="card" style={{ width: 460, padding: 28, position: "relative" }}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Edit Faculty</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="label">Full Name</div>
                <input className="input" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <div className="label">Email</div>
                <input className="input" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <div className="label">Department</div>
                <select className="input" value={editing.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })}>
                  <option value="">Select department</option>
                  {uniqueDepartments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                </select>
              </div>
              <div>
                <div className="label">Employee ID</div>
                <input className="input" value={editing.employeeId || ""} onChange={(e) => setEditing({ ...editing, employeeId: e.target.value })} />
              </div>
              <div>
                <div className="label">Contact</div>
                <input className="input" value={editing.contact || ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
              </div>
              <div>
                <div className="label">Status</div>
                <select className="input" value={editing.isActive === false ? "Inactive" : "Active"} onChange={(e) => setEditing({ ...editing, isActive: e.target.value === "Active" })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="label">Assigned Academic Years</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {academicYears.map(year => (
                  <label key={year} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={(editing.assignedYears || []).includes(year)}
                      onChange={(e) => {
                        const years = editing.assignedYears || [];
                        if (e.target.checked) {
                          setEditing({ ...editing, assignedYears: [...years, year] });
                        } else {
                          setEditing({ ...editing, assignedYears: years.filter(y => y !== year) });
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13 }}>{year}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={loading}><Check size={14} /> Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
        {/* Add form */}
        <form onSubmit={add} className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Add Faculty</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div className="label">Full Name</div>
              <input required type="text" className="input" placeholder="Full Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <div className="label">Email</div>
              <input required type="email" className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <div className="label">Department</div>
              <select required className="input" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}>
                <option value="">Select department</option>
                {uniqueDepartments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Employee ID</div>
              <input required type="text" className="input" placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})} />
            </div>
            <div>
              <div className="label">Contact Number</div>
              <input type="text" className="input" placeholder="Contact Number" value={form.contact} onChange={(e) => setForm({...form, contact: e.target.value})} />
            </div>
            <div>
              <div className="label">Default Password</div>
              <input className="input" value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} />
            </div>
            <div>
              <div className="label">Assigned Academic Years</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {academicYears.map(year => (
                  <label key={year} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                    <input 
                      type="checkbox" 
                      checked={form.assignedYears.includes(year)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, assignedYears: [...form.assignedYears, year] });
                        } else {
                          setForm({ ...form, assignedYears: form.assignedYears.filter(y => y !== year) });
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    <span>{year}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              <Plus size={15} /> {loading ? "Adding…" : "Add Faculty"}
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
              All Faculty <span style={{ color: "var(--muted)", fontWeight: 400 }}>({displayedList.length})</span>
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <select className="input" style={{ minWidth: 180 }} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                <option value="">All Departments</option>
                {uniqueDepartments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
              </select>

              <form onSubmit={applySearch} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={13} style={{ color: "var(--muted)" }} />
                <input className="input" style={{ width: 220 }} placeholder="Search by name, email, employee ID" value={query} onChange={(e) => setQuery(e.target.value)} />
              </form>
            </div>
          </div>
          <table className="table-base" style={{ width: "100%" }}>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Department</th><th>Employee ID</th><th>Contact</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {displayedList.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>No faculty members yet</td></tr>
              )}
              {displayedList.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600, color: "var(--text)" }}>{u.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{u.email}</td>
                  <td>{getDepartmentDisplayName(u.department, departments)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>{u.employeeId || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{u.contact}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditing({ ...u, department: u.department?._id ? String(u.department._id) : (u.department || "") })} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", cursor: "pointer" }}><Edit2 size={13} /></button>
                      <button onClick={() => remove(u._id)} style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f87171", cursor: "pointer" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Page {pagination.page} of {pagination.totalPages}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /> Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}