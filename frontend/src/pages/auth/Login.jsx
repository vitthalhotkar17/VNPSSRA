import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, ScanFace, MapPin, ShieldCheck, UserPlus, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import PasswordInput from "../../components/PasswordInput.jsx";
import WalkingIntro from "../../components/WalkingIntro.jsx";

export default function Login() {
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password, role);
      toast.success(`Welcome, ${user.name}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--bg)" }}>

      {/* ── Left brand panel ── */}
      <div style={{
        background: "linear-gradient(145deg,#1a1740 0%,#2e2870 40%,#4c1d95 70%,#1a1740 100%)",
        display: "flex", flexDirection: "column", padding: 52,
        position: "relative", overflow: "hidden"
      }} className="hidden lg:flex">
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.15) 0%,transparent 65%)", pointerEvents: "none" }} />

        {/* Entrance animation — plays once, then hands off to the brand content below */}
        {!introDone && <WalkingIntro onComplete={() => setIntroDone(true)} />}

        {/* Logo */}
        <div style={{
          position: "relative", display: "flex", alignItems: "center", gap: 14, marginBottom: 64,
          opacity: introDone ? 1 : 0, transform: introDone ? "translateY(0)" : "translateY(10px)",
          transition: "opacity .6s ease .05s, transform .6s ease .05s"
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.12)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff" }}>Vision Tracker</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.14em" }}>Smart Attendance System</p>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: introDone ? 1 : 0, transform: introDone ? "translateY(0)" : "translateY(14px)",
          transition: "opacity .6s ease .15s, transform .6s ease .15s"
        }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 18 }}>
            Smarter Attendance,<br />Starts Here.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14.5, lineHeight: 1.75, maxWidth: 380, marginBottom: 44 }}>
            Secure, contactless attendance powered by real-time face recognition and GPS geofencing. Built for modern institutions.
          </p>

          {/* Feature cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { Icon: ScanFace, label: "Face Auth",      sub: "99.2% accuracy" },
              { Icon: MapPin,   label: "Live GPS",       sub: "500 m geofence" },
              { Icon: ShieldCheck, label: "Secure",      sub: "JWT encrypted" },
            ].map(({ Icon, label, sub }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: "18px 16px", backdropFilter: "blur(10px)" }}>
                <Icon size={22} color="rgba(255,255,255,0.75)" />
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 12 }}>{label}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", marginTop: 3 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{
          position: "relative", fontSize: 11.5, color: "rgba(255,255,255,0.25)", marginTop: 48,
          opacity: introDone ? 1 : 0, transition: "opacity .6s ease .25s"
        }}>
          © {new Date().getFullYear()} Vesion tracker · Smart Attendance Management System v3.0
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 52px", background: "var(--surface)", overflowY: "auto" }}>
        <div style={{
          width: "100%", maxWidth: 420,
          opacity: introDone ? 1 : 0, transform: introDone ? "translateY(0)" : "translateY(18px)",
          transition: "opacity .6s ease .1s, transform .6s ease .1s"
        }}>

          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }} className="lg:hidden">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "grid", placeItems: "center" }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Vesion tracker</p>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            Sign in to your account
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 28 }}>
            Welcome back — enter your credentials below.
          </p>

          {/* Role selector */}
          <div style={{ marginBottom: 24 }}>
              <div className="label">I am a</div>
              <div style={{ display: "flex", gap: 6, background: "var(--surface2)", border: "1px solid var(--border)", padding: 5, borderRadius: 12 }}>
                {["student", "faculty", "admin"].map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={{
                    flex: 1, padding: "9px 8px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s", border: "1px solid transparent",
                    background: role === r ? "linear-gradient(135deg,#6366f1,#7c3aed)" : "transparent",
                    color: role === r ? "#fff" : "var(--muted)",
                    boxShadow: role === r ? "0 0 20px rgba(99,102,241,0.35)" : "none",
                    textTransform: "capitalize"
                  }}>{r}</button>
                ))}
              </div>
            </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="label">Email Address</div>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input required type="email" className="input input-icon-left" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={`${role}@vesiontracker.edu`} />
              </div>
            </div>

            <PasswordInput id="password" name="password" label="Password" required minLength={6}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock size={15} />} />

            <div style={{ textAlign: "right" }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full" style={{ marginTop: 4, justifyContent: "center" }}>
              {loading
                ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Please wait…</>
                : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            New student?{" "}
            <Link to="/register" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <UserPlus size={13} /> Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
