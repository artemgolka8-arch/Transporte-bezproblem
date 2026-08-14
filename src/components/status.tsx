export type VehicleStatus = "AVAILABLE" | "WORKSHOP" | "RENTED";

export const STATUS_CONFIG: Record<
  VehicleStatus,
  {
    label: string;
    dot: string;
    text: string;
    border: string;
    bg: string;
    glow: string;
    ring: string;
  }
> = {
  AVAILABLE: {
    label: "Доступен",
    dot: "bg-mint",
    text: "text-mint",
    border: "border-mint/40",
    bg: "bg-mintDim/40",
    glow: "shadow-glowMint",
    ring: "ring-mint/50",
  },
  WORKSHOP: {
    label: "В мастерской",
    dot: "bg-amber",
    text: "text-amber",
    border: "border-amber/40",
    bg: "bg-amberDim/40",
    glow: "shadow-glowAmber",
    ring: "ring-amber/50",
  },
  RENTED: {
    label: "В аренде",
    dot: "bg-violet",
    text: "text-violet",
    border: "border-violet/40",
    bg: "bg-violetDim/40",
    glow: "shadow-glowViolet",
    ring: "ring-violet/50",
  },
};

export function StatusBadge({ status }: { status: VehicleStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${c.border} ${c.bg} px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${c.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${c.dot} ${
          status === "WORKSHOP" ? "animate-pulseBeacon" : ""
        }`}
      />
      {c.label}
    </span>
  );
}
