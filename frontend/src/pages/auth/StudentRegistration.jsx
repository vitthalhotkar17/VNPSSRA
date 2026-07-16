import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, ScanFace, MapPin, ShieldCheck, ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";
import FaceCapture from "../../components/FaceCapture.jsx";
import PasswordInput from "../../components/PasswordInput.jsx";
import WalkingIntro from "../../components/WalkingIntro.jsx";

export default function StudentRegistration() {
  const [form, setForm] = useState({ name: "", email: "", password: "", rollNo: "", department: "", year: 1 });
  const [faceImage, setFaceImage] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [faceSignature, setFaceSignature] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await import("../../services/api.js").then(({ api }) => api.get("/departments"));
        setDepartments(data?.data?.departments || []);
      } catch {
        setDepartments([]);
      }
    };

    loadDepartments();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!faceImage) throw new Error("Please capture your face before registering.");
      if (!faceDescriptor) throw new Error("Could not read a face descriptor. Please retake your capture in better lighting.");

      const yearMap = {
        1: "First Year",
        2: "Second Year",
        3: "Third Year",
        4: "Fourth Year",
      };
      const academicYear = yearMap[form.year] || (typeof form.year === "string" ? yearMap[parseInt(form.year, 10)] : undefined);

      const user = await register({
        ...form,
        role: "student",
        faceImage,
        faceSignature,
        faceDescriptor,
        academicYear,
      });

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
      <div style={{
        background: "linear-gradient(145deg,#1a1740 0%,#2e2870 40%,#4c1d95 70%,#1a1740 100%)",
        display: "flex", flexDirection: "column", padding: 52,
        position: "relative", overflow: "hidden"
      }} className="hidden lg:flex">
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: "20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,85,247,0.15) 0%,transparent 65%)", pointerEvents: "none" }} />

        {!introDone && <WalkingIntro onComplete={() => setIntroDone(true)} />}

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

        <div style={{
          position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          opacity: introDone ? 1 : 0, transform: introDone ? "translateY(0)" : "translateY(14px)",
          transition: "opacity .6s ease .15s, transform .6s ease .15s"
        }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1.15, marginBottom: 18 }}>
            Create Your Student Account
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14.5, lineHeight: 1.75, maxWidth: 380, marginBottom: 44 }}>
            Register once, then use face-based attendance and secure campus access in minutes.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { Icon: ScanFace, label: "Face Auth", sub: "99.2% accuracy" },
              { Icon: MapPin, label: "Live GPS", sub: "500 m geofence" },
              { Icon: ShieldCheck, label: "Secure", sub: "JWT encrypted" },
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 52px", background: "var(--surface)", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440, opacity: introDone ? 1 : 0, transform: introDone ? "translateY(0)" : "translateY(18px)", transition: "opacity .6s ease .1s, transform .6s ease .1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }} className="lg:hidden">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "grid", placeItems: "center" }}>
              <GraduationCap size={20} color="#fff" />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Vesion tracker</p>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            Create student account
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 24 }}>
            Quick registration, start marking attendance right away.
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="label">Full Name</div>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav Mehta" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="label">Roll No.</div>
                <input required className="input" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} placeholder="CS2101" />
              </div>
              <div>
                <div className="label">Year</div>
                <select className="input" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })}>
                  {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="label">Department</div>
              <select required className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Select a department</option>
                {departments.filter((dept) => dept?.status !== "Inactive").map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name} {dept.code ? `(${dept.code})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Email Address</div>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                <input required type="email" className="input input-icon-left" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@vesiontracker.edu" />
              </div>
            </div>

            <PasswordInput id="password" name="password" label="Password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" leftIcon={<Lock size={15} />} />

            <div>
              <div className="label">Face Capture</div>
              <FaceCapture onCapture={(img, proof, signature, descriptor) => { setFaceImage(img); setFaceSignature(signature); setFaceDescriptor(descriptor); }} captureCount={36} captureInterval={140} />
            </div>

            <button type="submit" disabled={loading || !faceImage} className="btn btn-primary btn-lg w-full" style={{ marginTop: 4, justifyContent: "center" }}>
              {loading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Please wait…</> : <>Create account <ArrowRight size={15} /></>}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <LogIn size={13} /> Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
