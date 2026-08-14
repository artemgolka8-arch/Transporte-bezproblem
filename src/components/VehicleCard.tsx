"use client";

import Link from "next/link";
import { StatusRing } from "./StatusRing";
import { StatusBadge } from "./status";
import { KeyIcon } from "./VehicleIcons";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export type VehicleCardData = {
  id: string;
  code: string;
  name: string;
  type: "BIKE" | "SCOOTER";
  status: "AVAILABLE" | "WORKSHOP" | "RENTED";
  problemDescription?: string | null;
  location?: string | null;
  renter?: string | null;
  keys: { id: string }[];
};

export function VehicleCard({
  vehicle,
  index,
  onDelete,
}: {
  vehicle: VehicleCardData;
  index: number;
  onDelete?: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/vehicle/${vehicle.id}`}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      className="group panel relative flex flex-col gap-4 p-5 animate-rise transition-all hover:-translate-y-0.5 hover:border-cyan/30"
    >
      {onDelete && (
        <button
          type="button"
          title={t("delete_vehicle_btn")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(vehicle.id);
          }}
          className="absolute right-3 top-3 z-10 rounded-md border border-line bg-panel p-1.5 text-muted opacity-0 transition-all hover:border-danger/40 hover:text-danger group-hover:opacity-100"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path
              d="M4 5.5H16M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5V16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V5.5M8.5 9v5M11.5 9v5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusRing status={vehicle.status} type={vehicle.type} size={52} />
          <div>
            <div className="font-mono text-xs text-faint">{vehicle.code}</div>
            <div className="font-display text-[15px] font-semibold text-ink leading-snug">
              {vehicle.name}
            </div>
          </div>
        </div>
        {vehicle.problemDescription && (
          <span
            title={t("has_open_problem")}
            className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-danger shadow-[0_0_10px_rgba(255,92,122,0.7)]"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={vehicle.status} />
        <div className="flex items-center gap-1.5 text-muted">
          <KeyIcon className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{vehicle.keys.length}</span>
        </div>
      </div>

      {vehicle.status === "RENTED" && vehicle.renter && (
        <div className="text-xs text-muted truncate">{t("renter_label", { name: vehicle.renter })}</div>
      )}
      {vehicle.status === "WORKSHOP" && vehicle.problemDescription && (
        <div className="line-clamp-2 text-xs text-amber/90">{vehicle.problemDescription}</div>
      )}
      {vehicle.location && vehicle.status === "AVAILABLE" && (
        <div className="text-xs text-muted truncate">{t("location_label", { name: vehicle.location })}</div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100 ring-1 ring-cyan/20" />
    </Link>
  );
}
