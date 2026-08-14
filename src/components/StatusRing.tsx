import { STATUS_CONFIG, VehicleStatus } from "./status";
import { BikeIcon, ScooterIcon } from "./VehicleIcons";

export function StatusRing({
  status,
  type,
  size = 64,
}: {
  status: VehicleStatus;
  type: "BIKE" | "SCOOTER";
  size?: number;
}) {
  const c = STATUS_CONFIG[status];
  const Icon = type === "BIKE" ? BikeIcon : ScooterIcon;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full border ${c.border} ${c.glow}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 rounded-full ${c.dot} opacity-10 ${
          status === "WORKSHOP" ? "animate-pulseBeacon" : ""
        }`}
      />
      {status === "RENTED" && (
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-violet/20 to-transparent animate-scan"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      )}
      <Icon className={`relative h-1/2 w-1/2 ${c.text}`} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${c.dot} ring-2 ring-bg ${
          status === "WORKSHOP" ? "animate-pulseBeacon" : ""
        }`}
      />
    </div>
  );
}
