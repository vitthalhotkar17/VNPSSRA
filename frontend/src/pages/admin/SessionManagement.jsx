import { useEffect, useState } from "react";
import { settingsService } from "../../services/api.js";
import { attendanceService } from "../../services/attendanceService.js";
import toast from "react-hot-toast";
import { Activity, CalendarDays, Clock3, MapPin, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";
import { getCurrentLocation } from "../../utils/geolocation.js";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export default function SessionManagement() {
  const [s, setS] = useState({ sessionDuration: 30, gpsRadius: 500, campusLat: null, campusLng: null });
  const [sessions, setSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const settings = await settingsService.getSettings();
        if (isMounted) {
          setS((prev) => ({ ...prev, ...settings, campusLat: settings.campusLat ?? prev.campusLat ?? null, campusLng: settings.campusLng ?? prev.campusLng ?? null }));
        }
      } catch (err) {
        if (!isMounted) return;
        toast.error(err.message || "Unable to load settings");
      }
    };

    const loadDashboard = async () => {
      try {
        const [history, records] = await Promise.all([
          attendanceService.listSessions(),
          attendanceService.listAttendance(),
        ]);

        if (!isMounted) return;
        setSessions(history);
        setAttendanceRecords(records);
        setLastUpdated(new Date());
      } catch (err) {
        if (!isMounted) return;
        toast.error(err.message || "Unable to load live session data");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const activeSessions = sessions.filter((session) => session.active);
  const completedSessions = sessions.length - activeSessions.length;
  const verifiedAttendance = attendanceRecords.filter((record) => record.faceVerified).length;

  const save = async (e) => {
    e.preventDefault();
    try {
      await settingsService.saveSettings({
        sessionDuration: Number(s.sessionDuration),
        gpsRadius: Number(s.gpsRadius),
        campusLat: s.campusLat != null && s.campusLat !== "" ? Number(s.campusLat) : null,
        campusLng: s.campusLng != null && s.campusLng !== "" ? Number(s.campusLng) : null,
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.message || "Unable to save settings");
    }
  };

  const captureGPS = async () => {
    try {
      const pos = await getCurrentLocation();
      setS((x) => ({ ...x, campusLat: pos.lat, campusLng: pos.lng }));
      toast.success("Campus location captured");
    } catch (err) {
      toast.error(err.message || "Unable to capture GPS");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              <Radio size={12} className="animate-pulse" /> Live Session Control
            </div>
            <h2 className="text-2xl font-bold">Session management with live attendance insights</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Monitor live sessions, review recent attendance activity, and update campus GPS settings from one place.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">Last refresh</p>
            <p className="mt-1 text-sm font-semibold">{lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { label: "Active sessions", value: activeSessions.length, icon: Activity },
            { label: "Completed sessions", value: completedSessions, icon: Clock3 },
            { label: "Verified marks", value: verifiedAttendance, icon: ShieldCheck },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/15 bg-slate-950/20 p-4">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <item.icon size={16} />
                {item.label}
              </div>
              <div className="mt-3 text-2xl font-bold">{loading ? "…" : item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={save} className="card space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-bold">Session & GPS Settings</h3>
              <p className="mt-1 text-sm text-slate-500">Keep the attendance radius and campus coordinates aligned with your current location.</p>
            </div>
            <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
              <MapPin size={16} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label"><Clock3 size={14} className="mr-1 inline" /> Session Duration (minutes)</label>
              <input required type="number" min="5" max="240" className="input" value={s.sessionDuration} onChange={(e) => setS({ ...s, sessionDuration: +e.target.value })} />
            </div>
            <div>
              <label className="label"><MapPin size={14} className="mr-1 inline" /> GPS Radius (meters)</label>
              <input required type="number" min="10" max="2000" className="input" value={s.gpsRadius} onChange={(e) => setS({ ...s, gpsRadius: +e.target.value })} />
            </div>
            <div>
              <label className="label">Campus Latitude</label>
              <input className="input" value={s.campusLat ?? ""} onChange={(e) => setS({ ...s, campusLat: +e.target.value })} />
            </div>
            <div>
              <label className="label">Campus Longitude</label>
              <input className="input" value={s.campusLng ?? ""} onChange={(e) => setS({ ...s, campusLng: +e.target.value })} />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={captureGPS} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <MapPin size={16} className="mr-2" />
              Capture current GPS
            </button>
            <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              Save settings
            </button>
          </div>
        </form>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              <h3 className="font-display font-bold">Live Session Overview</h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{activeSessions.length > 0 ? "Live now" : "Idle"}</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading live activity…</p>
          ) : activeSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No active session is running right now.
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session._id} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{session.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">Hosted by {session.facultyName || session.facultyId?.name || "—"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">Active</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {formatDate(session.startedAt || session.createdAt)}</span>
                    {session.lat && session.lng ? <span className="inline-flex items-center gap-1"><MapPin size={14} /> {session.lat.toFixed(4)}, {session.lng.toFixed(4)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users size={15} className="text-indigo-500" />
              Recent Attendance
            </div>
            <div className="space-y-3">
              {attendanceRecords.slice(0, 4).map((record) => (
                <div key={record._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{record.studentName || record.studentId?.name || "Student"}</p>
                    <p className="text-xs text-slate-500">{record.subject || record.sessionId?.subject || "—"}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${record.faceVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {record.faceVerified ? "Verified" : "Pending"}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-500">{formatDate(record.checkIn || record.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-indigo-500" />
            <h3 className="font-display font-bold">Session History</h3>
          </div>
          <p className="text-sm text-slate-500">Updated automatically every 10 seconds</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading session history…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No session history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3">Faculty</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Started</th>
                  <th className="py-2 pr-3">Ended</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-700">{session.facultyName || session.facultyId?.name || "—"}</td>
                    <td className="py-2 pr-3 text-slate-600">{session.subject}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${session.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {session.active ? "Active" : "Ended"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{formatDate(session.startedAt || session.createdAt)}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatDate(session.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
