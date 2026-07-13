import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../services/api.js";
import toast from "react-hot-toast";

const departmentOptions = ["Co", "Ej", "Mech", "Civil"];

const normalizeDepartment = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  const departmentMap = {
    co: "Co",
    ej: "Ej",
    mech: "Mech",
    civil: "Civil",
  };

  return departmentMap[normalized] || "";
};

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", rollNo: user?.rollNo || "", department: normalizeDepartment(user?.department), year: user?.year || 1 });
  const [saving, setSaving] = useState(false);
  const showLockedFieldMessage = () => {
    toast.error("Year cannot be changed here.");
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put("/profile", {
        name: form.name,
        department: form.department,
        rollNo: form.rollNo,
      });

      const updatedUser = data.data?.user || { ...form, department: form.department };
      updateUser(updatedUser);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} className="card p-6 max-w-xl space-y-4">
      <h3 className="font-display font-bold">Edit Profile</h3>
      {['name','email','rollNo'].map((k) => (
        <div key={k}>
          <label className="label capitalize">{k}</label>
          <input required className="input" value={form[k] || ""} onChange={(e)=>setForm({...form,[k]:e.target.value})}/>
        </div>
      ))}
      <div>
        <label className="label">Department</label>
        <select required className="input" value={form.department || ""} onChange={(e)=>setForm({...form, department: e.target.value})}>
          <option value="">Select department</option>
          {departmentOptions.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Year</label>
        <input className="input cursor-not-allowed" value={form.year} readOnly onClick={showLockedFieldMessage} onFocus={showLockedFieldMessage} />
      </div>
      <button className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
    </form>
  );
}