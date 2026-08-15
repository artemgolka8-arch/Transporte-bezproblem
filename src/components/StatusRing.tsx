import { STATUS_CONFIG, VehicleStatus } from "./status";
import { BikeIcon, ScooterIcon, MopedIcon } from "./VehicleIcons";
import { BRAND_VISUALS, BRAND_DEFAULT_PHOTOS, VehicleBrand } from "@/lib/brands";

export function StatusRing({
  status,
  type,
  brand,
  imageUrl,
  size = 64,
}: {
  status: VehicleStatus;
  type: "BIKE" | "SCOOTER";
  brand?: VehicleBrand | null;
  imageUrl?: string | null;
  size?: number;
}) {
  const c = STATUS_CONFIG[status];
  const visual = brand ? BRAND_VISUALS[brand] : null;
  const IconByShape = { bike: BikeIcon, scooter: ScooterIcon, moped: MopedIcon };
  const Icon = visual ? IconByShape[visual.icon] : type === "BIKE" ? BikeIcon : ScooterIcon;
  // Своё фото техники — в приоритете; иначе дефолтное фото марки, если оно загружено
  const photo = imageUrl || (brand ? BRAND_DEFAULT_PHOTOS[brand] : undefined);

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
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="relative h-full w-full rounded-full object-cover"
        />
      ) : visual ? (
        <div className={`relative flex h-full w-full items-center justify-center rounded-full ${visual.bg}`}>
          <Icon className={`h-1/2 w-1/2 ${visual.fg}`} />
        </div>
      ) : (
        <Icon className={`relative h-1/2 w-1/2 ${c.text}`} />
      )}
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${c.dot} ring-2 ring-bg ${
          status === "WORKSHOP" ? "animate-pulseBeacon" : ""
        }`}
      />
    </div>
  );
}
