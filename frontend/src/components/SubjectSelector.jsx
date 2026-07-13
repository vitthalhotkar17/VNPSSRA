import toast from "react-hot-toast";

export default function SubjectSelector({ subjects, selectedSubjects, onChange, max = 3 }) {
  const toggleSubject = (subject) => {
    const selected = selectedSubjects.includes(subject);
    if (!selected && selectedSubjects.length >= max) {
      toast.error(`Maximum ${max} subjects can be assigned.`);
      return;
    }

    const next = selected
      ? selectedSubjects.filter((item) => item !== subject)
      : [...selectedSubjects, subject];

    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Subjects</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Select up to 3 subjects</h3>
          </div>
          <span className="chip bg-brand-50 text-brand-700">Selected: {selectedSubjects.length}/{max}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => toggleSubject(subject)}
              className={`rounded-2xl border p-4 text-left transition ${selectedSubjects.includes(subject) ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-300 hover:bg-white"}`}
            >
              <div className="font-medium">{subject}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
