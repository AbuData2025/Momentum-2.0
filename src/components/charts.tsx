import type { RunType } from "../lib/workout";

export const TYPE_COLOR: Record<RunType, string> = { long: "#5eead4", easy: "#8b9bd1", tempo: "#c92572", steady: "#a78bd1", intervals: "#f5a524" };

export function BarChart({ values, labels, height = 150, summary }: { values: number[]; labels: string[]; height?: number; summary: string }) {
  const max = Math.max(...values, 1);
  return (
    <div role="img" aria-label={summary}>
      <div className="flex items-end gap-3" style={{ height }}>
        {values.map((v, i) => (
          <div key={labels[i]} className="flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 font-mono text-[10px] text-muted">{v > 0 ? Math.round(v) : ""}</span>
            <div className={`w-full max-w-12 rounded-sm ${i === values.length - 1 ? "bg-accent" : "bg-accent-muted"}`} style={{ height: Math.max(v > 0 ? 3 : 0, (v / max) * (height - 22)) }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-muted">{labels.map((l, i) => <span key={l} className="flex-1 text-center">{labels.length > 8 && i % 2 ? "" : l}</span>)}</div>
    </div>
  );
}

export function LineChart({ points, labels, format, summary }: { points: (number | null)[]; labels: string[]; format: (v: number) => string; summary: string }) {
  const W = 320, H = 140, px = 28, py = 26;
  const vals = points.filter((p): p is number => p !== null);
  if (!vals.length) return <p className="py-10 text-center text-xs text-muted">No runs in this period.</p>;
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const x = (i: number) => px + (i * (W - 2 * px)) / Math.max(1, points.length - 1);
  const y = (v: number) => py + (1 - (v - lo) / span) * (H - 2 * py);
  const pts = points.map((p, i) => (p === null ? null : { i, v: p, x: x(i), y: hi === lo ? H / 2 : y(p) })).filter((p) => p !== null);
  return (
    <div role="img" aria-label={summary}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2" points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />
        {pts.map((p) => (
          <g key={p.i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="var(--color-muted)" fontFamily="var(--font-mono)">{format(p.v)}</text>
          </g>
        ))}
      </svg>
      <div className="flex text-[10px] text-muted">{labels.map((l, i) => <span key={l} className="flex-1 text-center">{labels.length > 8 && i % 2 ? "" : l}</span>)}</div>
    </div>
  );
}

export function SegmentedBar({ parts }: { parts: { type: RunType; pct: number }[] }) {
  return (
    <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
      {parts.map((p) => <span key={p.type} style={{ width: `${p.pct}%`, background: TYPE_COLOR[p.type] }} />)}
    </div>
  );
}
