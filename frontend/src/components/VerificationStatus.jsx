export default function VerificationStatus({ status }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-slate-950/75 p-4 shadow-lg shadow-slate-950/10 transition-all duration-300">
      <div className={`grid h-10 w-10 place-items-center rounded-2xl bg-white/10 text-xl ${status.color}`}>
        {status.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{status.label}</p>
        <p className="text-xs text-slate-400">Position your face inside the circle.</p>
      </div>
    </div>
  );
}
