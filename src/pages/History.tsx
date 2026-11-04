import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import LogWorkoutButton from "../components/LogWorkoutButton";
import { useWorkouts } from "../components/WorkoutsProvider";
import { EmptyState, PageHeader, StatCard } from "../components/ui";
import { formatDuration, formatPace, paceSecPerKm } from "../lib/format";
import { filterWorkouts, paginate, summarize, toCSV, weekCounts, type Filters } from "../lib/history";
import { RUN_TYPES, RUN_TYPE_LABEL } from "../lib/workout";
import { removeWorkout } from "../lib/workouts";

const RANGES = [{ label: "All time", days: null }, { label: "Last 14 days", days: 14 }, { label: "Last 30 days", days: 30 }, { label: "Last 90 days", days: 90 }];
const PAGE_SIZE = 10;
const control = "rounded-md border border-line bg-page px-3 py-2 text-xs";

const hm = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;

export default function History() {
  const { user } = useAuth();
  const { workouts, loading, error, openForm } = useWorkouts();
  const [filters, setFilters] = useState<Filters>({ query: "", type: "all", days: null });
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => setPage(1), [filters]);

  const filtered = useMemo(() => filterWorkouts(workouts, filters), [workouts, filters]);
  const sum = useMemo(() => summarize(filtered), [filtered]);
  const weeks = useMemo(() => weekCounts(workouts), [workouts]);
  const view = paginate(filtered, page, PAGE_SIZE);
  const rangeLabel = RANGES.find((r) => r.days === filters.days)?.label ?? "All time";

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCSV(filtered)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "momentum-workouts.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function confirmDelete(id: string) {
    try { await removeWorkout(user!.uid, id); setDeleteError(false); } catch { setDeleteError(true); }
    setConfirmId(null);
  }

  return (
    <>
      <PageHeader eyebrow="Your running record" title="Workout history" subtitle="Every session, in one place. Review, edit or remove your logged runs." action={<LogWorkoutButton />} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`Distance · ${rangeLabel}`} value={sum.distanceKm.toFixed(1)} unit="km" note="Completed distance" />
        <StatCard label="Total moving time" value={hm(sum.seconds)} unit="hrs" note={`Across ${sum.count} logged runs`} />
        <StatCard label="Average pace" value={sum.paceSec ? formatPace(sum.paceSec) : "–:––"} unit="/km" note="Weighted by distance" />
        <StatCard label="Logged workouts" value={String(workouts.length)} unit="runs" note={`${weeks.thisWeek} this week · ${weeks.lastWeek} last week`} />
      </div>

      <div className="mt-6 rounded-lg border border-line bg-card">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-48 flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input aria-label="Search workouts" placeholder="Search workout name or notes" value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })} className={`${control} w-full pl-8`} />
          </div>
          <select aria-label="Date range" className={control} value={filters.days ?? ""}
            onChange={(e) => setFilters({ ...filters, days: e.target.value ? Number(e.target.value) : null })}>
            {RANGES.map((r) => <option key={r.label} value={r.days ?? ""}>{r.label}</option>)}
          </select>
          <select aria-label="Run type" className={control} value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters["type"] })}>
            <option value="all">All run types</option>
            {RUN_TYPES.map((t) => <option key={t} value={t}>{RUN_TYPE_LABEL[t]}</option>)}
          </select>
          <button onClick={exportCsv} disabled={filtered.length === 0} className={`${control} ml-auto flex items-center gap-2 disabled:opacity-50`}>
            <Download size={13} /> Export CSV
          </button>
        </div>

        {deleteError && <p role="alert" className="border-t border-line px-4 py-3 text-xs text-accent">We couldn't delete that workout. Check your connection and try again.</p>}

        {loading ? <p className="border-t border-line p-6 text-xs text-muted">Loading your workouts…</p>
          : error ? <div className="border-t border-line p-4"><EmptyState title="Couldn't load your workouts" body="Check your connection and refresh the page." /></div>
          : workouts.length === 0 ? <div className="border-t border-line p-4"><EmptyState title="No workouts yet" body="Log your first run, or add a past one with any earlier date." /></div>
          : filtered.length === 0 ? <div className="border-t border-line p-4"><EmptyState title="No workouts match these filters" body="Try a wider date range or clear the search." /></div>
          : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted">
                  <tr>{["Date", "Workout", "Type", "Distance", "Time", "Pace /km", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {view.items.map((w) => (
                    <tr key={w.id} className="border-t border-line">
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{new Date(`${w.date}T00:00`).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="px-4 py-3"><p className="font-medium">{w.name}</p>{w.notes && <p className="text-[11px] text-muted">{w.notes}</p>}</td>
                      <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] ${w.runType === "tempo" ? "bg-accent-soft text-accent" : "bg-raised text-muted"}`}>{RUN_TYPE_LABEL[w.runType]}</span></td>
                      <td className="px-4 py-3 font-mono">{w.distanceKm.toFixed(1)} km</td>
                      <td className="px-4 py-3 font-mono">{formatDuration(w.durationSec)}</td>
                      <td className="px-4 py-3 font-mono">{formatPace(paceSecPerKm(w.distanceKm, w.durationSec))}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {confirmId === w.id ? (
                          <span className="flex items-center gap-3">
                            <span className="text-muted">Delete this run?</span>
                            <button onClick={() => confirmDelete(w.id)} className="font-semibold text-accent">Yes, delete</button>
                            <button onClick={() => setConfirmId(null)} className="text-muted">Keep</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-4">
                            <button onClick={() => openForm(w)} className="flex items-center gap-1 text-muted hover:text-ink"><Pencil size={12} /> Edit</button>
                            <button onClick={() => setConfirmId(w.id)} className="flex items-center gap-1 text-accent"><Trash2 size={12} /> Delete</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-muted">
            <span>Showing {view.from}–{view.to} of {view.total} workouts · Newest first</span>
            <span className="flex items-center gap-3">
              <button disabled={view.page <= 1} onClick={() => setPage(view.page - 1)} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span>Page {view.page} of {view.pages}</span>
              <button disabled={view.page >= view.pages} onClick={() => setPage(view.page + 1)} className="rounded-md border border-line px-3 py-1.5 disabled:opacity-40">Next</button>
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-line bg-card p-4">
        <div>
          <p className="text-xs font-semibold">Missed a log, not a run?</p>
          <p className="text-[11px] text-muted">Add a workout for any past date. Your history and weekly totals will update.</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs"><Plus size={13} /> Add past workout</button>
      </div>
    </>
  );
}
