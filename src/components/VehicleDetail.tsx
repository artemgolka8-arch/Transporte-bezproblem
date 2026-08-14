"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusRing } from "./StatusRing";
import { StatusBadge, STATUS_CONFIG, VehicleStatus } from "./status";
import { KeyPeg, KeyData } from "./KeyPeg";
import { canEdit } from "@/lib/roles";

type HistoryEntry = {
  id: string;
  status: VehicleStatus;
  note: string | null;
  userName: string | null;
  createdAt: string;
};

export type VehicleFull = {
  id: string;
  code: string;
  name: string;
  type: "BIKE" | "SCOOTER";
  status: VehicleStatus;
  problemDescription: string | null;
  location: string | null;
  renter: string | null;
  keys: KeyData[];
  history: HistoryEntry[];
};

export function VehicleDetail({
  vehicle,
  role,
}: {
  vehicle: VehicleFull;
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "keys">("overview");
  const [v, setV] = useState(vehicle);
  const [problemDraft, setProblemDraft] = useState(vehicle.problemDescription || "");
  const [savingProblem, setSavingProblem] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const editable = canEdit(role);

  async function changeStatus(status: VehicleStatus) {
    if (!editable || status === v.status) return;
    setSavingStatus(true);
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSavingStatus(false);
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({ ...prev, status: updated.status, history: updated.history }));
      router.refresh();
    }
  }

  async function saveProblem() {
    setSavingProblem(true);
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemDescription: problemDraft,
        note: problemDraft ? "Обновлено описание проблемы" : "Проблема снята",
      }),
    });
    setSavingProblem(false);
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({ ...prev, problemDescription: updated.problemDescription, history: updated.history }));
      router.refresh();
    }
  }

  async function updateKey(id: string, data: Partial<KeyData>) {
    const res = await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({ ...prev, keys: prev.keys.map((k) => (k.id === id ? updated : k)) }));
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Удалить этот ключ?")) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setV((prev) => ({ ...prev, keys: prev.keys.filter((k) => k.id !== id) }));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        ← К флоту
      </button>

      <div className="panel mb-6 flex flex-wrap items-center gap-5 p-6">
        <StatusRing status={v.status} type={v.type} size={72} />
        <div className="flex-1 min-w-[200px]">
          <div className="font-mono text-xs text-faint">{v.code}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{v.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={v.status} />
            {v.location && <span className="text-xs text-muted">· {v.location}</span>}
            {v.renter && <span className="text-xs text-muted">· Арендатор: {v.renter}</span>}
          </div>
        </div>

        {editable && (
          <div className="flex gap-2">
            {(["AVAILABLE", "WORKSHOP", "RENTED"] as const).map((s) => {
              const c = STATUS_CONFIG[s];
              const active = v.status === s;
              return (
                <button
                  key={s}
                  disabled={savingStatus}
                  onClick={() => changeStatus(s)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    active
                      ? `${c.border} ${c.bg} ${c.text}`
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center gap-1 rounded-lg border border-line bg-panel p-1 w-fit">
        <button
          onClick={() => setTab("overview")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "overview" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Обзор
        </button>
        <button
          onClick={() => setTab("keys")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "keys" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          Ключи · {v.keys.length}
        </button>
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="panel p-6">
            <div className="label-eyebrow mb-3">описание проблем</div>
            {editable ? (
              <>
                <textarea
                  value={problemDraft}
                  onChange={(e) => setProblemDraft(e.target.value)}
                  rows={5}
                  placeholder="Например: спущено колесо, требуется замена тормозных колодок…"
                  className="w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan/50"
                />
                <button
                  onClick={saveProblem}
                  disabled={savingProblem}
                  className="mt-3 rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2 text-xs font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingProblem ? "Сохранение…" : "Сохранить"}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                {v.problemDescription || "Проблем не зафиксировано."}
              </p>
            )}
          </div>

          <div className="panel p-6">
            <div className="label-eyebrow mb-3">история статусов</div>
            <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {v.history.length === 0 && (
                <p className="text-sm text-muted">Записей пока нет.</p>
              )}
              {v.history.map((h) => {
                const c = STATUS_CONFIG[h.status];
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                    <div>
                      <div className="text-xs text-ink">
                        <span className={c.text}>{c.label}</span>
                        {h.note ? ` — ${h.note}` : ""}
                      </div>
                      <div className="text-[11px] text-faint">
                        {new Date(h.createdAt).toLocaleString("ru-RU")}
                        {h.userName ? ` · ${h.userName}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="label-eyebrow">панель ключей</div>
            {editable && (
              <button
                onClick={() => setAddingKey(true)}
                className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-3 py-1.5 text-xs font-medium text-cyan transition-opacity hover:opacity-90"
              >
                + Добавить ключ
              </button>
            )}
          </div>

          {v.keys.length === 0 && !addingKey ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <div className="text-sm text-ink">На доске пока пусто</div>
              <div className="text-xs text-muted">Добавьте первый ключ для этой единицы техники</div>
            </div>
          ) : (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-8 rounded-xl border border-line/60 p-6 sm:grid-cols-3 md:grid-cols-4"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              {v.keys.map((k) => (
                <KeyPeg key={k.id} keyData={k} role={role} onUpdate={updateKey} onDelete={deleteKey} />
              ))}
            </div>
          )}

          {addingKey && (
            <AddKeyForm
              vehicleId={v.id}
              onClose={() => setAddingKey(false)}
              onCreated={(key) => {
                setV((prev) => ({ ...prev, keys: [...prev.keys, key] }));
                setAddingKey(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddKeyForm({
  vehicleId,
  onClose,
  onCreated,
}: {
  vehicleId: string;
  onClose: () => void;
  onCreated: (key: KeyData) => void;
}) {
  const [label, setLabel] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [holder, setHolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId, label, isDuplicate, holder }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Не удалось создать ключ");
      return;
    }
    const key = await res.json();
    onCreated(key);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Новый ключ</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">Название</label>
        <input
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ключ от батареи A"
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">Место хранения / держатель</label>
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="Сейф в мастерской, полка 2"
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-5 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isDuplicate}
            onChange={(e) => setIsDuplicate(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-cyan"
          />
          Это дубликат
        </label>

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
          {loading ? "Создание…" : "Добавить на доску"}
        </button>
      </form>
    </div>
  );
}
