import type { ReactNode } from "react";
import { Plus } from "lucide-react";

export function PageHeader({ eyebrow, title, subtitle, action }: {
  eyebrow: string; title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const LogWorkoutButton = () => (
  <button className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-xs font-semibold hover:brightness-110">
    <Plus size={14} /> Log workout
  </button>
);

export function StatCard({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-3 font-mono text-2xl font-semibold">
        {value} {unit && <span className="text-xs font-normal text-muted">{unit}</span>}
      </p>
      {note && <p className="mt-2 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card p-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}
