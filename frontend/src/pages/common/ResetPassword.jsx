import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { authService } from "../../services/authService.js";
import toast from "react-hot-toast";
import PasswordInput from "../../components/PasswordInput.jsx";

export default function ResetPassword() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: 28 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Reset Password</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 24 }}>Enter your current password, set a new password, and confirm it to update your account.</p>

          <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
      <PasswordInput
  id="current-password"
  name="current-password"
  label="Current Password"
  value={currentPassword}
  onChange={(e) => setCurrentPassword(e.target.value)}
  required
  autoComplete="current-password"
/>

<PasswordInput
  id="new-password"
  name="new-password"
  label="New Password"
  value={newPassword}
  onChange={(e) => setNewPassword(e.target.value)}
  required
  autoComplete="new-password"
  minLength={6}
/>

<PasswordInput
  id="confirm-password"
  name="confirm-password"
  label="Confirm Password"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  required
  autoComplete="new-password"
  minLength={6}
/>

            <button disabled={loading} className="btn btn-primary" style={{ justifyContent: "center" }}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
