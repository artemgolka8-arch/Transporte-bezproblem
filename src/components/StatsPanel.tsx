"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { STATUS_CONFIG, type VehicleStatus } from "./status";
import { BRAND_LABEL_KEYS, type VehicleBrand } from "@/lib/brands";

type StatsResponse = {
  total: number;
  byStatus: Record<VehicleStatus, number>;
  byType: Record<
    "BIKE" | "SCOOTER",
    { total: number; AVAILABLE: number; WORKSHOP: number; RENTED: number }
  >;
  byCity: { city: string; total: number; AVAILABLE: number; WORKSHOP: number; RENTED: number }[];
  byBrand: { brand: VehicleBrand; total: number }[];
};

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

export function StatsPanel({
  counts,
  variant = "topbar",
}: {
  counts: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
  variant?: "topbar" | "sidebar";
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setError(false);
      fetch("/api/stats")
        .then((res) => {
          if (!res.ok) throw new Error("failed");
          return res.json();
        })
        .then((json: StatsResponse) => setData(json))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }

  const totalFallback = counts.AVAILABLE + counts.WORKSHOP + counts.RENTED;
  const sidebar = variant === "sidebar";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className={
          sidebar
            ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                open ? "bg-violetDim/70 text-violet font-medium" : "text-muted hover:bg-panel2/70 hover:text-ink"
              }`
            : `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                open ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`
        }
      >
        {sidebar && <BarChartIcon />}
        {t("nav_stats")}
      </button>

      {open && (
        <div
          className={`animate-rise scrollbar-thin panel z-40 mt-2 max-h-[70vh] w-[340px] overflow-y-auto p-4 ${
            sidebar ? "absolute left-2 top-full" : "absolute right-0 top-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="label-eyebrow">{t("stats_title")}</div>
            <div className="font-mono text-sm text-ink">{data?.total ?? totalFallback}</div>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-faint">
              {t("stats_by_status")}
            </div>
            <div className="space-y-0.5">
              {(["AVAILABLE", "WORKSHOP", "RENTED"] as const).map((s) => {
                const c = STATUS_CONFIG[s];
                const value = data?.byStatus[s] ?? counts[s];
                return (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-panel2/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                      <span className={`text-xs ${c.text}`}>{t(c.labelKey)}</span>
                    </div>
                    <span className="font-mono text-sm text-ink">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {loading && !data && (
            <div className="py-6 text-center text-xs text-faint">{t("stats_loading")}</div>
          )}
          {error && <div className="py-6 text-center text-xs text-danger">{t("stats_error")}</div>}

          {data && (
            <>
              <div className="mb-4">
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-faint">
                  {t("stats_by_type")}
                </div>
                <div className="space-y-0.5">
                  {(["BIKE", "SCOOTER"] as const).map((tp) => (
                    <div
                      key={tp}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-panel2/50"
                    >
                      <span className="text-xs text-ink">
                        {t(tp === "BIKE" ? "type_bike" : "type_scooter")}
                      </span>
                      <span className="font-mono text-sm text-ink">{data.byType[tp].total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.byCity.length > 0 && (
                <div className="mb-4">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-faint">
                    {t("stats_by_city")}
                  </div>
                  <div className="space-y-0.5">
                    {data.byCity.map((c) => (
                      <div
                        key={c.city}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-panel2/50"
                      >
                        <span className="text-xs text-ink">
                          {c.city === "—" ? t("stats_no_city") : c.city}
                        </span>
                        <span className="font-mono text-sm text-ink">{c.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.byBrand.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-faint">
                    {t("stats_by_brand")}
                  </div>
                  <div className="space-y-0.5">
                    {data.byBrand.map((b) => (
                      <div
                        key={b.brand}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-panel2/50"
                      >
                        <span className="text-xs text-ink">{t(BRAND_LABEL_KEYS[b.brand])}</span>
                        <span className="font-mono text-sm text-ink">{b.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
