"use client";

import Link from "next/link";
import { StatusRing } from "./StatusRing";
import { StatusBadge } from "./status";
import { KeyIcon } from "./VehicleIcons";

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

export function VehicleCard({ vehicle, index }: { vehicle: VehicleCardData; index: number }) {
  return (
    <Link
      href={`/vehicle/${vehicle.id}`}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      className="group panel relative flex flex-col gap-4 p-5 animate-rise transition-all hover:-translate-y-0.5 hover:border-cyan/30"
    >
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
            title="Есть открытая проблема"
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
        <div className="text-xs text-muted truncate">Арендатор: {vehicle.renter}</div>
      )}
      {vehicle.status === "WORKSHOP" && vehicle.problemDescription && (
        <div className="line-clamp-2 text-xs text-amber/90">{vehicle.problemDescription}</div>
      )}
      {vehicle.location && vehicle.status === "AVAILABLE" && (
        <div className="text-xs text-muted truncate">Локация: {vehicle.location}</div>
      )}

      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100 ring-1 ring-cyan/20" />
    </Link>
  );
}
