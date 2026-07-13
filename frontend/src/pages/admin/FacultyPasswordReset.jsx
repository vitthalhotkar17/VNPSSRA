import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import toast from "react-hot-toast";
import PasswordInput from "../../components/PasswordInput.jsx";

export default function FacultyPasswordReset() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data } = await api.get("/admin/faculty");
        setUsers(data.data?.faculty || []);
      } catch (err) {
        toast.error(err.message);
      }
    };
    loadUsers();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedId) return toast.error("Please select a faculty member.");
    if (!pwd || pwd.length < 6) return toast.error("Password must be at least 6 characters.");

    setLoading(true);
    try {
      await api.post(`/admin/faculty/${selectedId}/reset-password`, { password: pwd });
      toast.success("Faculty password updated");
      setPwd("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6 max-w-xl space-y-4">
      <h3 className="font-display font-bold">Faculty password reset</h3>
      <div>
        <label className="label">Faculty</label>
        <select required className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">Select faculty</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} — {u.email}
            </option>
          ))}
        </select>
      </div>
      <PasswordInput
        id="new-password"
        name="new-password"
        label="New password"
        required
        minLength={6}
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={loading}
      >
        {loading ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
