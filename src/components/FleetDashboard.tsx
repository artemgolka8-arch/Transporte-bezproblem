"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VehicleCard, VehicleCardData } from "./VehicleCard";
import { canEdit } from "@/lib/roles";

type StatusFilter = "ALL" | "AVAILABLE" | "WORKSHOP" | "RENTED";
type TypeFilter = "ALL" | "BIKE" | "SCOOTER";

export function FleetDashboard({
  vehicles,
  role,
}: {
  vehicles: VehicleCardData[];
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && v.type !== typeFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!v.name.toLowerCase().includes(q) && !v.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [vehicles, statusFilter, typeFilter, query]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">панель управления</div>
          <h1 className="font-display text-2xl font-semibold text-ink">Флот техники</h1>
          <p className="mt-1 text-sm text-muted">
            {filtered.length} из {vehicles.length} единиц
          </p>
        </div>
        {canEdit(role) && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
          >
            + Добавить транспорт
          </button>
        )}
      </div>

      <div className="mb-7 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию или коду…"
          className="w-full max-w-xs rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-ink outline-none transition-colors focus:border-cyan/50"
        />

        <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
          {(["ALL", "BIKE", "SCOOTER"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                typeFilter === t ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t === "ALL" ? "Все типы" : t === "BIKE" ? "Велосипеды" : "Самокаты"}
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
                ? "Все статусы"
                : s === "AVAILABLE"
                ? "Доступен"
                : s === "WORKSHOP"
                ? "В мастерской"
                : "В аренде"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="font-display text-lg text-ink">Ничего не найдено</div>
          <div className="text-sm text-muted">Измените поиск или фильтры</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v, i) => (
            <VehicleCard key={v.id} vehicle={v} index={i} />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddVehicleModal
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

function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"BIKE" | "SCOOTER">("BIKE");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, type, location }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось создать");
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-md p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Новая техника</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">Код (уникальный)</label>
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="BK-015"
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Название</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Городской велосипед №15"
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Тип</label>
        <div className="mb-4 flex gap-2">
          {(["BIKE", "SCOOTER"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                type === t
                  ? "border-cyan/40 bg-cyanDim/40 text-cyan"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {t === "BIKE" ? "Велосипед" : "Самокат"}
            </button>
          ))}
        </div>

        <label className="mb-1 block label-eyebrow">Локация (необязательно)</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Склад А"
          className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Создание…" : "Добавить в систему"}
        </button>
      </form>
    </div>
  );
}
