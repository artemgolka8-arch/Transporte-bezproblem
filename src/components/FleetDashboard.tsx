"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleCard, VehicleCardData } from "./VehicleCard";
import { BRAND_LABEL_KEYS, BIKE_BRAND_OPTIONS, SCOOTER_BRAND_OPTIONS, VehicleBrand } from "@/lib/brands";
import { SCOOTER_COLOR_OPTIONS, COLOR_LABEL_KEYS, COLOR_SWATCH, VehicleColor } from "@/lib/colors";
import { canEdit, isAdmin } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type StatusFilter = "ALL" | "AVAILABLE" | "WORKSHOP" | "RENTED";
type TypeFilter = "ALL" | "BIKE" | "SCOOTER";

export function FleetDashboard({
  vehicles,
  role,
  knownCities = [],
  lastRavapiSync = null,
}: {
  vehicles: VehicleCardData[];
  role: "ADMIN" | "MANAGER" | "VIEWER";
  knownCities?: string[];
  lastRavapiSync?: string | null;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [list, setList] = useState(vehicles);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState(lastRavapiSync);

  useEffect(() => {
    setList(vehicles);
  }, [vehicles]);

  async function syncWithRavapi() {
    setSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/vehicles/ravapi-sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(data.error || t("vehicles_sync_error"));
        return;
      }
      setSyncMessage(
        `${t("vehicles_sync_success")}: ${data.rented ?? 0} ${t("vehicles_sync_rented")}, ${data.released ?? 0} ${t("vehicles_sync_released")}` +
          (data.unmatched ? `, ${data.unmatched} ${t("vehicles_sync_unmatched")}` : "")
      );
      setSyncedAt(new Date().toISOString());
      router.refresh();
    } catch {
      setSyncError(t("vehicles_sync_error"));
    } finally {
      setSyncing(false);
    }
  }

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
        <div className="flex flex-wrap items-center gap-2">
          {canEdit(role) && (
            <button
              onClick={syncWithRavapi}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line bg-bg2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-60"
            >
              <RefreshIcon spinning={syncing} />
              {syncing ? t("vehicles_syncing") : t("vehicles_sync_btn")}
            </button>
          )}
          {canEdit(role) && (
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              {t("add_vehicle_btn")}
            </button>
          )}
        </div>
      </div>

      {canEdit(role) && (
        <div className="mb-4 text-xs text-muted">
          {syncedAt
            ? `${t("vehicles_last_synced")}: ${new Date(syncedAt).toLocaleString("ru-RU")}`
            : t("vehicles_never_synced")}
        </div>
      )}
      {syncMessage && (
        <div className="mb-4 rounded-lg border border-mint/30 bg-mintDim/40 px-3 py-2 text-xs text-mint">
          {syncMessage}
        </div>
      )}
      {syncError && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {syncError}
        </div>
      )}

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

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5" />
      <path d="M20 20v-4.5h-4.5" />
    </svg>
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
  const [vin, setVin] = useState("");
  const [type, setType] = useState<"BIKE" | "SCOOTER">("BIKE");
  const [brand, setBrand] = useState<VehicleBrand | "">("");
  const [color, setColor] = useState<VehicleColor | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const brandOptions = type === "BIKE" ? BIKE_BRAND_OPTIONS : SCOOTER_BRAND_OPTIONS;

  function changeType(next: "BIKE" | "SCOOTER") {
    setType(next);
    // марка привязана к типу — при смене типа список вариантов меняется, сбрасываем выбор
    setBrand("");
    setColor("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, vin: vin || null, type, brand: brand || null, color: color || null, city: city || null, imageUrl: imageUrl || null }),
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

        <label className="mb-1 block label-eyebrow">{t("field_vin")}</label>
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder={t("vin_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-cyan/50"
        />

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

        {type === "SCOOTER" && (
          <>
            <label className="mb-1 block label-eyebrow">
              {t("field_color")} <span className="text-faint normal-case">({t("color_optional")})</span>
            </label>
            <div className="mb-4 flex flex-wrap gap-2">
              {SCOOTER_COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(color === c ? "" : c)}
                  title={t(COLOR_LABEL_KEYS[c])}
                  aria-label={t(COLOR_LABEL_KEYS[c])}
                  className={`relative h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c ? "border-cyan scale-110" : "border-line hover:scale-105"
                  }`}
                  style={{ backgroundColor: COLOR_SWATCH[c] }}
                >
                  {color === c && (
                    <svg viewBox="0 0 20 20" fill="none" className="absolute inset-0 m-auto h-4 w-4 drop-shadow">
                      <path
                        d="M4.5 10.5l3.5 3.5 7-8"
                        stroke={c === "WHITE" || c === "YELLOW" ? "#1c1c1e" : "#fff"}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>              ))}
            </div>
          </>
        )}

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
