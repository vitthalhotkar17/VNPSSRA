export default function Loader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "var(--bg)" }}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full" style={{ border: "3px solid rgba(99,102,241,0.15)" }} />
        <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ border: "3px solid transparent", borderTopColor: "#6366f1" }} />
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}
