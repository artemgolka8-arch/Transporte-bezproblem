"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleCard, VehicleCardData } from "./VehicleCard";
import { BRAND_LABEL_KEYS, BIKE_BRAND_OPTIONS, SCOOTER_BRAND_OPTIONS, VehicleBrand } from "@/lib/brands";
import { canEdit, isAdmin } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type StatusFilter = "ALL" | "AVAILABLE" | "WORKSHOP" | "RENTED";
type TypeFilter = "ALL" | "BIKE" | "SCOOTER";

export function FleetDashboard({
  vehicles,
  role,
  knownCities = [],
}: {
  vehicles: VehicleCardData[];
  role: "ADMIN" | "MANAGER" | "VIEWER";
  knownCities?: string[];
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [list, setList] = useState(vehicles);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setList(vehicles);
  }, [vehicles]);

  const filtered = useMemo(() => {
    return list.filter((v) => {
      if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && v.type !== typeFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!v.name.toLowerCase().includes(q) && !v.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [list, statusFilter, typeFilter, query]);

  async function deleteVehicle(id: string) {
    if (!confirm(t("delete_vehicle_confirm"))) return;
    const prev = list;
    setList((cur) => cur.filter((v) => v.id !== id));
    const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setList(prev);
      alert(t("delete_vehicle_failed"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">{t("dashboard_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("dashboard_title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t("dashboard_count", { filtered: filtered.length, total: list.length })}
          </p>
        </div>
        {canEdit(role) && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
          >
            {t("add_vehicle_btn")}
          </button>
        )}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full max-w-xs rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
        />

        <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
          {(["ALL", "BIKE", "SCOOTER"] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                typeFilter === tp ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {tp === "ALL" ? t("type_all") : tp === "BIKE" ? t("type_bike") : t("type_scooter")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
          {(["ALL", "AVAILABLE", "WORKSHOP", "RENTED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                statusFilter === s ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {s === "ALL"
                ? t("status_all")
                : s === "AVAILABLE"
                ? t("status_available")
                : s === "WORKSHOP"
                ? t("status_workshop")
                : t("status_rented")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="font-display text-lg text-ink">{t("empty_title")}</div>
          <div className="text-sm text-muted">{t("empty_subtitle")}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v, i) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              index={i}
              onDelete={isAdmin(role) ? deleteVehicle : undefined}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddVehicleModal
          knownCities={knownCities}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddVehicleModal({
  onClose,
  onCreated,
  knownCities,
}: {
  onClose: () => void;
  onCreated: () => void;
  knownCities: string[];
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"BIKE" | "SCOOTER">("BIKE");
  const [brand, setBrand] = useState<VehicleBrand | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const brandOptions = type === "BIKE" ? BIKE_BRAND_OPTIONS : SCOOTER_BRAND_OPTIONS;

  function changeType(next: "BIKE" | "SCOOTER") {
    setType(next);
    // марка привязана к типу — при смене типа список вариантов меняется, сбрасываем выбор
    setBrand("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, type, brand: brand || null, city: city || null, imageUrl: imageUrl || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-md p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_vehicle_title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_code")}</label>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_type")}</label>
        <div className="mb-4 flex gap-2">
          {(["BIKE", "SCOOTER"] as const).map((tp) => (
            <button
              type="button"
              key={tp}
              onClick={() => changeType(tp)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                type === tp
                  ? "border-cyan/40 bg-cyanDim/40 text-cyan"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {tp === "BIKE" ? t("vehicle_bike") : t("vehicle_scooter")}
            </button>
          ))}
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_brand")}</label>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value as VehicleBrand | "")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          <option value="">{t("choose_brand")}</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {t(BRAND_LABEL_KEYS[b])}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
        <input
          list="city-suggestions"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("city_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />
        <datalist id="city-suggestions">
          {knownCities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <label className="mb-1 block label-eyebrow">{t("field_photo_optional")}</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder={t("photo_placeholder")}
          className="mb-1.5 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />
        <p className="mb-5 text-[11px] text-faint">{t("photo_hint")}</p>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("add_to_system")}
        </button>
      </form>
    </div>
  );
}
