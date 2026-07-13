import { useEffect, useState } from "react";
import { CalendarDays, MapPin, UserRound, ShieldCheck, Clock3, BadgeCheck, Sparkles, Radio } from "lucide-react";
import { attendanceService } from "../../services/attendanceService.js";

const renderSessionLabel = (session) => {
  if (!session) return "Session";
  if (typeof session === "string") return session;
  if (typeof session === "object") {
    if (session.subject || session.facultyName) {
      return `${session.subject || "Session"}${session.facultyName ? ` · ${session.facultyName}` : ""}`;
    }
    if (session._id || session.id) return session._id || session.id;
  }
  return "Session";
};

export default function AdminAttendance() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const records = await attendanceService.listAttendance();
        if (isMounted) setList(records);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const verifiedCount = list.filter((r) => r.faceVerified).length;
  const presentCount = list.filter((r) => r.status === "Present").length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_35%),linear-gradient(135deg,_#05070d,_#111827)] p-6 shadow-2xl shadow-black/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
              <Sparkles size={12} className="text-indigo-400" />
              Attendance Monitor
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Attendance Records</h3>
            <p className="mt-2 text-sm text-slate-400">Live verification data from the attendance system.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
            <Radio size={14} className="animate-pulse" />
            Live data
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { label: "Total Records", value: list.length, icon: CalendarDays },
            { label: "Verified", value: verifiedCount, icon: ShieldCheck },
            { label: "Present", value: presentCount, icon: BadgeCheck },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <item.icon size={15} className="text-indigo-400" />
                {item.label}
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{loading ? "…" : item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-2xl shadow-black/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Latest Attendance Activity</h3>
            <p className="text-sm text-slate-400">Recent check-ins and verification states.</p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-400">
            Auto-refresh every 10s
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 py-10 text-center text-slate-500">
            Loading attendance records...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 py-12 text-center text-slate-500">
            No attendance records yet
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const sessionLabel = renderSessionLabel(r.sessionId);
              const statusClass = r.status === "Present"
                ? "bg-emerald-500/10 text-emerald-300"
                : r.status === "Late"
                  ? "bg-amber-500/10 text-amber-300"
                  : "bg-sky-500/10 text-sky-300";

              return (
                <div key={r._id || r.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm transition hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-950/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserRound size={15} className="text-indigo-400" />
                        <p className="font-semibold text-white">{r.studentName || "Student"}</p>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{sessionLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.faceVerified ? <BadgeCheck size={15} className="text-emerald-400" /> : null}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{r.status}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <ShieldCheck size={14} className="text-indigo-400" />
                        Face verification
                      </div>
                      <p className="mt-1 font-medium text-slate-200">{r.faceVerified ? "Verified" : "Unverified"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} className="text-indigo-400" />
                        GPS
                      </div>
                      <p className="mt-1 font-medium text-slate-200">
                        {typeof r.lat === "number" ? `${r.lat.toFixed(4)}, ${r.lng?.toFixed(4)}` : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock3 size={14} className="text-indigo-400" />
                        Time
                      </div>
                      <p className="mt-1 font-medium text-slate-200">{new Date(r.checkIn || r.timestamp || r.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
