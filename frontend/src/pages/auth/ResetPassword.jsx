import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService.js";
import toast from "react-hot-toast";
import PasswordInput from "../../components/PasswordInput.jsx";

const getQueryParams = (search) => {
  return Object.fromEntries(new URLSearchParams(search));
};

export default function AuthResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = getQueryParams(location.search);
    setToken(params.token || "");
    setUserId(params.userId || "");
  }, [location.search]);

  const submit = async (event) => {
    event.preventDefault();
    if (!token || !userId) {
      toast.error("Invalid reset link. Please request a new password reset.");
      return;
    }
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, userId, password);
      toast.success("Password reset successful. You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div className="card" style={{ padding: 32 }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 10 }}>Reset Password</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 24 }}>Enter a new password to complete your reset.</p>

          <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
            <PasswordInput
              id="new-password"
              name="new-password"
              label="New Password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              label="Confirm Password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            <button disabled={loading} className="btn btn-primary" style={{ justifyContent: "center" }}>
              {loading ? "Resetting…" : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
