export default function VerificationProgress({ value }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
        <span>Verification progress</span>
        <span>{Math.min(100, Math.max(0, value))}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10 shadow-inner">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}
