import { useRef, useState } from "react";

const split = (v: string) => {
  const p = v ? v.split(":") : [];
  return p.length === 2 ? ["0", p[0], p[1]] : [p[0] ?? "", p[1] ?? "", p[2] ?? ""];
};

/** Hours : minutes : seconds with the colons built in. Emits "h:mm:ss", or "" when empty. */
export default function DurationInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const [parts, setParts] = useState(() => split(value));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const labels = ["Hours", "Minutes", "Seconds"];

  const update = (i: number, raw: string) => {
    const next = [...parts];
    next[i] = raw.replace(/\D/g, "").slice(0, 2);
    setParts(next);
    onChange(next.every((p) => p === "") ? "" : next.map((p) => p || "0").join(":"));
    if (next[i].length === 2 && i < 2) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex items-center gap-2">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-muted">:</span>}
          <input
            ref={(el) => { refs.current[i] = el; }}
            aria-label={labels[i]} inputMode="numeric" placeholder="00" value={p}
            onChange={(e) => update(i, e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => e.key === "Backspace" && p === "" && i > 0 && refs.current[i - 1]?.focus()}
            className={`w-14 rounded-md border bg-page px-2 py-2 text-center font-mono text-xs ${invalid ? "border-accent" : "border-line"}`}
          />
        </span>
      ))}
    </div>
  );
}
