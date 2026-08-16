export type ProfileAccent = "violet" | "cyan" | "mint" | "faint";

const ACCENT_MAP: Record<
  ProfileAccent,
  { text: string; bg: string; ring: string; dot: string }
> = {
  violet: { text: "text-violet", bg: "bg-violetDim", ring: "ring-violet/20", dot: "bg-violet" },
  cyan: { text: "text-cyan", bg: "bg-cyanDim", ring: "ring-cyan/20", dot: "bg-cyan" },
  mint: { text: "text-mint", bg: "bg-mintDim", ring: "ring-mint/20", dot: "bg-mint" },
  faint: { text: "text-faint", bg: "bg-panel2", ring: "ring-faint/15", dot: "bg-faint" },
};

export function ProfileHeader({
  eyebrow,
  initials,
  name,
  subtitle,
  accent,
  statusLabel,
  meta,
  clearance,
}: {
  eyebrow: string;
  initials: string;
  name: string;
  subtitle: string;
  accent: ProfileAccent;
  statusLabel: string;
  meta: { label: string; value: string }[];
  clearance?: { level: number; max: number; label: string };
}) {
  const c = ACCENT_MAP[accent];

  return (
    <div className="border-b border-line pb-8">
      <div className="label-eyebrow mb-5">{eyebrow}</div>

      <div className="flex flex-wrap items-center gap-5">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${c.bg} ring-1 ${c.ring} font-display text-xl font-semibold ${c.text}`}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-semibold text-ink">{name}</h1>
          <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start pt-1">
          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
          <span className="text-xs uppercase tracking-wide text-muted">{statusLabel}</span>
        </div>
      </div>

      {(meta.length > 0 || clearance) && (
        <div className="mt-7 flex flex-wrap gap-x-12 gap-y-5">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="label-eyebrow mb-1">{m.label}</div>
              <div className="text-sm text-ink">{m.value || "—"}</div>
            </div>
          ))}

          {clearance && (
            <div>
              <div className="label-eyebrow mb-2">{clearance.label}</div>
              <div className="flex w-28 gap-1">
                {Array.from({ length: clearance.max }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-[3px] flex-1 rounded-full ${i < clearance.level ? c.dot : "bg-panel2"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
