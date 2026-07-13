import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api, resolveAssetUrl } from "../../services/api.js";
import toast from "react-hot-toast";

const formatDepartmentName = (value, departmentList = []) => {
  if (!value) return "";

  if (typeof value === "object") {
    if (value.name) return String(value.name);
    if (value.departmentName) return String(value.departmentName);
    if (value.title) return String(value.title);
    if (value.label) return String(value.label);
    if (value._id) {
      const match = departmentList.find((item) => String(item._id) === String(value._id));
      return match?.name ? String(match.name) : "";
    }
    return "";
  }

  const normalized = value.toString().trim().toLowerCase();
  const departmentMap = {
    co: "Computer Engineering",
    ej: "Electronics & Communication Engineering",
    mech: "Mechanical Engineering",
    civil: "Civil Engineering",
    "computer engineering": "Computer Engineering",
    "electronics & communication engineering": "Electronics & Communication Engineering",
    "electronics and communication engineering": "Electronics & Communication Engineering",
    "mechanical engineering": "Mechanical Engineering",
    "civil engineering": "Civil Engineering",
  };

  if (departmentMap[normalized]) return departmentMap[normalized];

  const match = departmentList.find((item) => {
    const id = String(item._id || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    const code = String(item.code || "").toLowerCase();
    return id === normalized || name === normalized || code === normalized;
  });

  return match?.name ? String(match.name) : "";
};

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ name: "", department: "", rollNo: "", enrollmentNo: "", year: "" });
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  const showLockedFieldMessage = () => {
    toast.error("Department, roll number, and enrollment number cannot be changed.");
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await api.get("/departments");
        const payload = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.departments) ? data.data.departments : [];
        setDepartments(payload);
      } catch {
        setDepartments([]);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        department: formatDepartmentName(user.department, departments),
        rollNo: user.rollNo || "",
        enrollmentNo: user.enrollmentNo || "",
        year: user.year || "",
      });
    }
  }, [user, departments]);

  if (!user) return null;

  const handleSaveImage = async (file) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("profileImage", file);

      const { data } = await api.post("/profile/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imagePath = data.data?.profileImage || data.data?.user?.profileImage;
      updateUser({ profileImage: imagePath });
      toast.success("Profile image updated");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload profile image");
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleSaveImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put("/profile", {
        name: form.name,
      });
      updateUser(data.data?.user);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="card p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={openFilePicker}
            className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border-4 border-slate-100 shadow-soft transition hover:ring-2 hover:ring-brand-500/40"
          >
            <img
              src={
                user.profileImage
                  ? resolveAssetUrl(user.profileImage)
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.name
                    )}&background=4f46e5&color=fff&rounded=true&size=128`
              }
              alt="Profile"
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-slate-950/0 px-3 pb-3 text-sm text-white opacity-0 transition duration-200 hover:opacity-100">
              <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                Change
              </span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div>
            <h3 className="font-display text-2xl font-bold">{user.name}</h3>
            <p className="text-slate-500">{user.email}</p>

            <div className="mt-2 flex items-center gap-2">
              <span className="chip bg-brand-50 text-brand-700 capitalize">{user.role}</span>
              {user.role === "student" && (user.year || form.year) ? (
                <span className="chip bg-slate-100 text-slate-700">Year {user.year || form.year}</span>
              ) : null}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Click the avatar to change your profile photo. JPG, PNG, or WEBP only. Max 5 MB.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold">Edit Profile</h3>
            <p className="text-sm text-slate-500">Update your profile details below.</p>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input" value={user.email || ""} disabled />
          </div>

          <div>
            <label className="label">Department</label>
            <input
              className="input cursor-not-allowed"
              value={form.department}
              readOnly
              onClick={showLockedFieldMessage}
              onFocus={showLockedFieldMessage}
            />
          </div>

          <div>
            <label className="label">Roll No.</label>
            <input
              className="input cursor-not-allowed"
              value={form.rollNo}
              readOnly
              onClick={showLockedFieldMessage}
              onFocus={showLockedFieldMessage}
            />
          </div>

          <div>
            <label className="label">Enrollment No.</label>
            <input
              className="input cursor-not-allowed"
              value={form.enrollmentNo}
              readOnly
              onClick={showLockedFieldMessage}
              onFocus={showLockedFieldMessage}
            />
          </div>

          <div>
            <label className="label">Year</label>
            <input
              className="input cursor-not-allowed"
              value={user.year || form.year || ""}
              readOnly
              onClick={showLockedFieldMessage}
              onFocus={showLockedFieldMessage}
            />
          </div>
        </div>

        <p className="text-sm text-amber-600">
          Department, roll number, and enrollment number are linked to your student record and cannot be edited here.
        </p>
      </form>
    </div>
  );
}