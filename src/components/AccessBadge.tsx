"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Deterministic barcode-style bars generated from a string (id / phone). */
function Barcode({ value, className = "" }: { value: string; className?: string }) {
  const bars = useMemo(() => {
    const chars = value.split("");
    return chars.map((c, i) => {
      const code = c.charCodeAt(0);
      const width = 1 + (code % 3);
      const tall = (code + i) % 5 !== 0;
      return { width, tall };
    });
  }, [value]);

  return (
    <div className={`flex h-7 items-end gap-[2px] ${className}`}>
      {bars.map((b, i) => (
        <span
          key={i}
          style={{ width: `${b.width}px`, height: b.tall ? "100%" : "55%" }}
          className="bg-ink/60"
        />
      ))}
    </div>
  );
}

export type BadgeAccent = "violet" | "cyan" | "mint" | "faint";

const ACCENT_MAP: Record<
  BadgeAccent,
  { ring: string; text: string; bg: string; glow: string; dot: string; gradient: string }
> = {
  violet: {
    ring: "ring-violet/50",
    text: "text-violet",
    bg: "bg-violetDim",
    glow: "shadow-glowViolet",
    dot: "bg-violet",
    gradient: "linear-gradient(120deg,#5B5FEE 0%,#1274E0 45%,#5B5FEE 100%)",
  },
  cyan: {
    ring: "ring-cyan/50",
    text: "text-cyan",
    bg: "bg-cyanDim",
    glow: "shadow-glowCyan",
    dot: "bg-cyan",
    gradient: "linear-gradient(120deg,#1274E0 0%,#5B5FEE 50%,#12B76A 100%)",
  },
  mint: {
    ring: "ring-mint/50",
    text: "text-mint",
    bg: "bg-mintDim",
    glow: "shadow-glowMint",
    dot: "bg-mint",
    gradient: "linear-gradient(120deg,#12B76A 0%,#1274E0 50%,#12B76A 100%)",
  },
  faint: {
    ring: "ring-faint/40",
    text: "text-faint",
    bg: "bg-panel2",
    glow: "",
    dot: "bg-faint",
    gradient: "linear-gradient(120deg,#8CA0BF 0%,#5B73A5 50%,#8CA0BF 100%)",
  },
};

export function AccessBadge({
  eyebrow,
  initials,
  name,
  subtitle,
  accent,
  ledLabel,
  ledPulse,
  meta,
  clearance,
  barcodeValue,
}: {
  eyebrow: string;
  initials: string;
  name: string;
  subtitle: string;
  accent: BadgeAccent;
  ledLabel: string;
  ledPulse: boolean;
  meta: { label: string; value: string }[];
  clearance?: { level: number; max: number; label: string };
  barcodeValue: string;
}) {
  const c = ACCENT_MAP[accent];
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 10 });
  }

  function onLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.5s ease" : "transform 0.08s ease-out",
          transformStyle: "preserve-3d",
        }}
        className="panel relative overflow-hidden animate-rise"
      >
        {/* holographic stripe */}
        <div className="relative h-24 overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: c.gradient }} />
          <div
            className="absolute inset-0 bg-scanline bg-[length:250%_100%] opacity-70 animate-scan"
            style={{ mixBlendMode: "overlay" }}
          />
          <div className="absolute inset-0 bg-grid bg-gridcell opacity-[0.12]" />
          {/* lanyard punch hole */}
          <div className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full bg-bg ring-1 ring-white/40" />

          <div className="absolute left-4 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85">
            {eyebrow}
          </div>

          {/* rfid chip */}
          <div className="absolute right-4 top-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/90 animate-pulseBeacon" />
            <div className="h-4 w-6 rounded-[3px] border border-white/50 bg-white/15 bg-grid bg-[length:5px_5px]" />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div
            className={`-mt-9 mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-panel ${c.bg} ring-4 ${c.ring} ${c.glow} font-display text-2xl font-semibold ${c.text}`}
          >
            {initials}
          </div>

          <h2 className="font-display text-xl font-semibold text-ink">{name}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted">{subtitle}</p>

          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${c.dot} ${ledPulse ? "animate-pulseBeacon" : ""}`}
            />
            <span className={`font-mono text-[11px] uppercase tracking-wide ${c.text}`}>{ledLabel}</span>
          </div>

          {meta.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-line pt-4">
              {meta.map((m) => (
                <div key={m.label}>
                  <div className="label-eyebrow mb-0.5">{m.label}</div>
                  <div className="truncate text-sm text-ink">{m.value || "—"}</div>
                </div>
              ))}
            </div>
          )}

          {clearance && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="label-eyebrow mb-2">{clearance.label}</div>
              <div className="flex gap-1">
                {Array.from({ length: clearance.max }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < clearance.level ? c.dot : "bg-panel2"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
            <Barcode value={barcodeValue} />
            <span className="font-mono text-[10px] tracking-wide text-faint">
              {barcodeValue.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
