import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { authService } from "../../services/authService.js";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent");
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--muted)", textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
        <div className="card" style={{ padding: 36 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", display: "grid", placeItems: "center", marginBottom: 20 }}>
            <Mail size={22} color="#818cf8" />
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Forgot your password?</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 28 }}>Enter your email and we'll send a reset link.</p>

          {sent ? (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "14px 16px", fontSize: 13.5, color: "#34d399" }}>
              ✓ If an account exists for <strong>{email}</strong>, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="label">Email Address</div>
                <div style={{ position: "relative" }}>
                  <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                  <input required type="email" className="input input-icon-left" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sams.edu" />
                </div>
              </div>
              <button disabled={loading} className="btn btn-primary" style={{ justifyContent: "center" }}>
                {loading ? "Sending…" : <><span>Send reset link</span> <ArrowRight size={14} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
