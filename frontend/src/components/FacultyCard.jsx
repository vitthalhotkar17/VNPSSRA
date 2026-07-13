export default function FacultyCard({ name, subjects = [], selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(name)}
      className={`w-full rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 ${selected ? "border-brand-500 bg-brand-50 shadow-soft" : "border-slate-200 bg-white shadow-sm"}`}
    >
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Faculty</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-3 text-sm text-slate-500">Assigned subjects: {subjects.length}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {subjects.slice(0, 3).map((subject) => (
          <span key={subject} className="chip bg-slate-100 text-slate-600">{subject}</span>
        ))}
      </div>
    </button>
  );
}
