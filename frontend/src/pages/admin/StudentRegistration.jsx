import { useState } from "react";
import { FiUser, FiMail, FiHash, FiLayers, FiCheckCircle, FiInfo, FiPhone } from "react-icons/fi";
import FaceCapture from "../../components/FaceCapture.jsx";
import { api } from "../../services/api.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const instructionItems = [
  "Position your face inside the circle.",
  "Ensure good lighting.",
  "Remove masks or sunglasses.",
  "Look directly at the camera.",
];

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: "", roll: "", email: "", department: "", year: "", academicYear: "", contact: "", password: "student123" });
  const [face, setFace]     = useState(null);
  const [faceSignature, setFaceSignature] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const onChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.roll || !form.email || !form.department || !form.year || !form.academicYear) {
      setStatus("error");
      setMessage("Please fill all required fields including academic year before registering.");
      return;
    }

    setSaving(true);
    try {
      if (face && !faceDescriptor) {
        setStatus("error");
        setMessage("Face captured but no descriptor was read. Please retake in better lighting.");
        setSaving(false);
        return;
      }
      await api.post("/admin/students", {
        name: form.name,
        rollNo: form.roll,
        email: form.email,
        department: form.department,
        year: parseInt(form.year),
        academicYear: form.academicYear,
        contact: form.contact || "N/A",
        password: form.password,
        faceImageBase64: face || undefined,
        faceSignature: faceSignature || undefined,
        faceDescriptor: faceDescriptor || undefined,
      });

      setStatus("success");
      setMessage(`Student "${form.name}" registered successfully. Face data ${face ? "saved to database." : "not captured (can be added later)."}`);
      toast.success("Student registered!");

      // Reset
      setForm({ name: "", roll: "", email: "", department: "", year: "", academicYear: "", contact: "", password: "student123" });
      setFace(null); setFaceDescriptor(null);
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Registration failed. Please try again.");
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-slate-950/10 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-sky-400">Student Face Registration</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Register Student</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Create a secure student profile. All data is stored in the database. Face capture is optional but recommended for attendance verification.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/95 p-4 text-white shadow-soft">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Storage</div>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold">
                <FiLayers className="text-cyan-300" /> Database
              </div>
            </div>
          </div>

          {message && (
            <div className={`mt-6 flex items-start gap-3 rounded-3xl border px-4 py-4 ${status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              <span className="mt-1 text-xl">{status === "success" ? <FiCheckCircle /> : <FiInfo />}</span>
              <div>
                <p className="font-semibold">{status === "success" ? "Registration Successful" : "Action Required"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { field: "name",       label: "Student Name",    icon: FiUser,   type: "text",  placeholder: "Enter full name",       req: true },
                { field: "roll",       label: "Roll Number",     icon: FiHash,   type: "text",  placeholder: "Enter roll number",     req: true },
                { field: "email",      label: "Email Address",   icon: FiMail,   type: "email", placeholder: "student@example.com",   req: true },
                { field: "department", label: "Department",      icon: FiLayers, type: "text",  placeholder: "Computer Science",      req: true },
                { field: "contact",    label: "Contact Number",  icon: FiPhone,  type: "text",  placeholder: "+91 9876543210",        req: false },
              ].map(({ field, label, icon: Icon, type, placeholder, req }) => (
                <div key={field} className="space-y-3">
                  <label className="label">{label}{req && " *"}</label>
                  <div className="relative">
                    <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input type={type} value={form[field]} onChange={onChange(field)}
                      placeholder={placeholder} className="input pl-12" required={req} />
                  </div>
                </div>
              ))}

              <div className="space-y-3">
                <label className="label">Academic Year *</label>
                <select value={form.year} onChange={onChange("year")} className="input" required>
                  <option value="">Select Year</option>
                  {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="label">Class Year *</label>
                <select value={form.academicYear} onChange={onChange("academicYear")} className="input" required>
                  <option value="">Select Class Year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Fourth Year">Fourth Year</option>
                </select>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="label">Default Password</label>
                <input type="text" value={form.password} onChange={onChange("password")} className="input" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/5 p-6 shadow-card">
              <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Face capture instructions</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Follow these steps for best quality. Face data will be securely stored in the database.</p>
                  <ul className="mt-5 space-y-3">
                    {instructionItems.map((item) => (
                      <li key={item} className="flex items-start gap-3 rounded-3xl border border-slate-200/70 bg-white/80 p-4 text-sm text-slate-700 shadow-sm">
                        <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[2rem] border border-white/15 bg-white/80 p-5 shadow-lg">
                  <div className="flex items-center gap-3 text-slate-700">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white"><FiInfo /></span>
                    <div>
                      <p className="font-semibold">Optional</p>
                      <p className="text-sm text-slate-500">Face can be registered later from the student's profile.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
                {saving ? "Registering…" : "Complete Registration"}
              </button>
              <button type="button" className="btn-secondary w-full sm:w-auto"
                onClick={() => { setForm({ name:"",roll:"",email:"",department:"",year:"",academicYear:"",contact:"",password:"student123" }); setFace(null); setFaceDescriptor(null); setMessage(null); }}>
                Reset Form
              </button>
            </div>
          </form>
        </div>

        {/* Face capture panel */}
        <div className="space-y-6 rounded-[2rem] border border-white/15 bg-slate-950/75 p-6 shadow-2xl text-white backdrop-blur-xl">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Live Face Preview</p>
                <h2 className="mt-2 text-2xl font-semibold">Face Registration Panel</h2>
              </div>
              <div className="rounded-3xl bg-slate-900/95 px-4 py-2 text-sm text-slate-200">
                {face ? "Captured ✓" : "Optional"}
              </div>
            </div>
            <div className="mt-6">
              <FaceCapture onCapture={(img, proof, signature, descriptor) => { setFace(img); setFaceSignature(signature); setFaceDescriptor(descriptor); setStatus(null); setMessage(null); }} captureCount={36} captureInterval={140} />
            </div>
          </div>

          {face && (
            <div className="rounded-[2rem] border border-emerald-200/20 bg-emerald-950/10 p-4 text-emerald-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Preview</p>
                  <p className="mt-2 text-lg font-semibold">Face captured — will save to DB</p>
                </div>
                <FiCheckCircle className="h-8 w-8 text-emerald-300" />
              </div>
              <div className="mt-4 rounded-3xl overflow-hidden border border-white/10">
                <img src={Array.isArray(face) ? face[0] : face} alt="Face preview" className="h-52 w-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
