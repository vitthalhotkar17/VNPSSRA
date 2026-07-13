import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import { api, resolveAssetUrl } from "../../services/api.js";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", employeeId: "" });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
    
      });
    }
  }, [user]);

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put("/profile", {
        name: form.name,
 
      });

      const updatedUser = data.data?.user || { ...user, ...form };
      updateUser(updatedUser);
      toast.success("Profile updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[360px_1fr] gap-6">
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
            <h2 className="font-display text-2xl font-bold">{user.name}</h2>
            <p className="text-slate-500">{user.email}</p>
            <span className="chip bg-brand-50 text-brand-700 mt-2 capitalize">
              {user.role}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Click the avatar to change your profile photo. JPG, PNG, or WEBP only. Max 5 MB.
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold">Profile Information</h3>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-md transition hover:bg-slate-50 hover:shadow-lg"
              style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828L7.828 13.828a2 2 0 0 1-.878.54l-3.5 1.166a.5.5 0 0 1-.632-.632l1.166-3.5a2 2 0 0 1 .54-.878l8.162-8.162Z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="grid gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={user.email} disabled />
            </div>
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Employee ID</label>
              <input
                className="input"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => {
                  setIsEditing(false);
                  setForm({
                    name: user.name || "",
                    department: user.department || "",
                    employeeId: user.employeeId || "",
                  });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4">
            <div>
              <p className="text-slate-500">Full Name</p>
              <p className="font-semibold">{user.name}</p>
            </div>

            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>

            <div>
              <p className="text-slate-500">Role</p>
              <p className="font-semibold capitalize">{user.role}</p>
            </div>

       
           

      
          </div>
        )}
      </div>
    </div>
  );
}