"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusRing } from "./StatusRing";
import { StatusBadge, STATUS_CONFIG, VehicleStatus } from "./status";
import { KeyPeg, KeyData } from "./KeyPeg";
import { BRAND_LABEL_KEYS, VehicleBrand } from "./VehicleCard";
import { VehicleColor, COLOR_LABEL_KEYS, COLOR_SWATCH } from "@/lib/colors";
import { canEdit, isAdmin } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Lang, TranslationKey } from "@/lib/i18n/translations";

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
  vin: string | null;
  name: string;
  type: "BIKE" | "SCOOTER";
  status: VehicleStatus;
  brand: VehicleBrand | null;
  color: VehicleColor | null;
  city: string | null;
  imageUrl: string | null;
  problemDescription: string | null;
  location: string | null;
  renter: string | null;
  renterFirstName: string | null;
  renterLastName: string | null;
  renterPhone: string | null;
  renterEmail: string | null;
  workshopDate: string | null;
  workshopReason: string | null;
  workshopMileage: number | null;
  workshopCity: string | null;
  keys: KeyData[];
  history: HistoryEntry[];
};

export type VehicleClientInfo = {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
};

export type DebtorMessageEntry = {
  id: string;
  target: string;
  body: string;
  status: string;
  error: string | null;
  sentBy: string | null;
  createdAt: string;
};

export type VehicleDebtorInfo = {
  id: string;
  currentBalance: number;
  balanceWithDeposits: number | null;
  dateOfFirstUnpaidPayoff: string | null;
  dateOfLastUnpaidPayoff: string | null;
  debtNotes: string | null;
  isContactedForDebt: boolean;
  lastSyncedAt: string;
  messages: DebtorMessageEntry[];
};

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}\u00A0zł`;
}

const WORKSHOP_CITIES = ["Wrocław", "Warszawa", "Kraków", "Poznań", "Gdańsk", "Łódź", "Szczecin"];

const KEY_PRESETS = [
  "key_preset_a",
  "key_preset_b",
  "key_preset_ignition",
  "key_preset_lock",
] as const;

export function VehicleDetail({
  vehicle,
  client,
  debtor,
  role,
}: {
  vehicle: VehicleFull;
  client: VehicleClientInfo | null;
  debtor: VehicleDebtorInfo | null;
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState<"overview" | "debt" | "history" | "keys" | "documents" | "notes">("overview");
  const [v, setV] = useState(vehicle);
  const [problemDraft, setProblemDraft] = useState(vehicle.problemDescription || "");
  const [savingProblem, setSavingProblem] = useState(false);
  const [editingVin, setEditingVin] = useState(false);
  const [vinDraft, setVinDraft] = useState(vehicle.vin || "");
  const [savingVin, setSavingVin] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
  const editable = canEdit(role);
  const admin = isAdmin(role);

  async function changeStatus(status: VehicleStatus, extra?: Record<string, unknown>) {
    if (!editable || (status === v.status && !extra)) return;
    setSavingStatus(true);
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    setSavingStatus(false);
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({
        ...prev,
        status: updated.status,
        renter: updated.renter,
        renterFirstName: updated.renterFirstName,
        renterLastName: updated.renterLastName,
        renterPhone: updated.renterPhone,
        renterEmail: updated.renterEmail,
        workshopDate: updated.workshopDate,
        workshopReason: updated.workshopReason,
        workshopMileage: updated.workshopMileage,
        workshopCity: updated.workshopCity,
        history: updated.history,
      }));
      router.refresh();
      return true;
    }
    return false;
  }

  function requestStatus(status: VehicleStatus) {
    if (!editable || status === v.status) return;
    if (status === "RENTED") {
      setRentModalOpen(true);
      return;
    }
    if (status === "WORKSHOP") {
      setWorkshopModalOpen(true);
      return;
    }
    changeStatus(status);
  }

  async function saveProblem() {
    setSavingProblem(true);
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problemDescription: problemDraft,
        note: problemDraft ? t("problem_updated_note") : t("problem_cleared_note"),
      }),
    });
    setSavingProblem(false);
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({ ...prev, problemDescription: updated.problemDescription, history: updated.history }));
      router.refresh();
    }
  }

  async function saveVin() {
    const next = vinDraft.trim();
    setSavingVin(true);
    const res = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: next,
        note: next ? t("vin_updated_note") : t("vin_cleared_note"),
      }),
    });
    setSavingVin(false);
    if (res.ok) {
      const updated = await res.json();
      setV((prev) => ({ ...prev, vin: updated.vin, history: updated.history }));
      setVinDraft(updated.vin || "");
      setEditingVin(false);
      router.refresh();
    }
  }

  function cancelVin() {
    setVinDraft(v.vin || "");
    setEditingVin(false);
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

  async function quickAddKey(label: string, isDuplicate: boolean) {
    setQuickAdding(label + (isDuplicate ? ":dup" : ""));
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: v.id, label, isDuplicate }),
    });
    setQuickAdding(null);
    if (res.ok) {
      const key = await res.json();
      setV((prev) => ({ ...prev, keys: [...prev.keys, key] }));
    }
  }

  async function deleteKey(id: string) {
    if (!confirm(t("delete_key_confirm"))) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setV((prev) => ({ ...prev, keys: prev.keys.filter((k) => k.id !== id) }));
    }
  }

  async function deleteVehicle() {
    if (!confirm(t("delete_vehicle_confirm"))) return;
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || t("delete_vehicle_failed"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  // Долг клиента, привязанного к технике — считаем один раз здесь, чтобы
  // бейдж в шапке был виден одинаково на всех вкладках, а не только на "Долге".
  const headerHasDebt = Boolean(debtor && debtor.currentBalance < 0);
  const headerTotalOwed = debtor ? Math.abs(debtor.currentBalance) : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          {t("back_to_fleet")}
        </button>

        {admin && (
          <button
            onClick={deleteVehicle}
            disabled={deleting}
            className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? t("deleting") : t("delete_vehicle_btn")}
          </button>
        )}
      </div>

      {deleteError && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {deleteError}
        </div>
      )}

      <div className="panel mb-6 flex flex-wrap items-center gap-5 p-6">
        <StatusRing status={v.status} type={v.type} brand={v.brand} color={v.color} imageUrl={v.imageUrl} size={72} />
        <div className="flex-1 min-w-[200px]">
          <div className="font-mono text-xs text-faint">{v.code}</div>
          {editingVin ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                autoFocus
                value={vinDraft}
                onChange={(e) => setVinDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveVin();
                  if (e.key === "Escape") cancelVin();
                }}
                placeholder={t("vin_placeholder")}
                className="w-40 rounded-md border border-line bg-bg2 px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-cyan/50"
              />
              <button
                onClick={saveVin}
                disabled={savingVin}
                className="rounded-md border border-cyan/40 bg-cyanDim/40 px-2 py-1 text-[11px] font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {savingVin ? t("saving") : t("save")}
              </button>
              <button
                onClick={cancelVin}
                disabled={savingVin}
                className="text-[11px] text-muted transition-colors hover:text-ink disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {v.vin ? (
                <span className="font-mono text-[11px] text-faint/70">VIN: {v.vin}</span>
              ) : editable ? (
                <span className="font-mono text-[11px] text-faint/50">{t("field_vin")}: —</span>
              ) : null}
              {editable && (
                <button
                  onClick={() => {
                    setVinDraft(v.vin || "");
                    setEditingVin(true);
                  }}
                  className="text-[11px] text-cyan/80 underline-offset-2 transition-colors hover:text-cyan hover:underline"
                >
                  {v.vin ? t("edit") : t("add")}
                </button>
              )}
            </div>
          )}
          <h1 className="font-display text-2xl font-semibold text-ink">{v.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={v.status} />
            {v.brand && <span className="text-xs text-muted">· {t(BRAND_LABEL_KEYS[v.brand])}</span>}
            {v.color && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                ·
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-line"
                  style={{ backgroundColor: COLOR_SWATCH[v.color] }}
                />
                {t(COLOR_LABEL_KEYS[v.color])}
              </span>
            )}
            {v.city && <span className="text-xs text-muted">· {v.city}</span>}
            {v.location && <span className="text-xs text-muted">· {v.location}</span>}
            {v.renter && <span className="text-xs text-muted">· {t("renter_label", { name: v.renter })}</span>}
            {v.status === "RENTED" && v.renterPhone && (
              <span className="text-xs text-muted">· {v.renterPhone}</span>
            )}
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
                  onClick={() => requestStatus(s)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    active
                      ? `${c.border} ${c.bg} ${c.text}`
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {t(c.labelKey)}
                </button>
              );
            })}
          </div>
        )}

        {/* Бейдж задолженности клиента — часть шапки, поэтому виден на всех
            вкладках техники, а не только внутри вкладки "Информация о долге". */}
        {client && debtor && (
          <div
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-glowViolet ${
              headerHasDebt
                ? "border-violet/40 bg-gradient-to-br from-violet/25 via-violet/10 to-cyan/10"
                : "border-mint/40 bg-mintDim/40"
            }`}
          >
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">{t("vehicle_header_debt_badge")}</div>
              <div className={`font-display text-xl font-bold ${headerHasDebt ? "text-danger" : "text-mint"}`}>
                {formatMoney(headerHasDebt ? headerTotalOwed : 0)}
              </div>
              <div className="mt-0.5 text-[10px] text-faint">
                {t("vehicle_header_debt_updated")}: {new Date(debtor.lastSyncedAt).toLocaleString(LOCALE_MAP[lang])}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-panel p-1 w-fit">
        <button
          onClick={() => setTab("overview")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "overview" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_overview")}
        </button>
        {client && (
          <button
            onClick={() => setTab("debt")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm transition-colors ${
              tab === "debt" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t("tab_debt")}
            {debtor && debtor.currentBalance < 0 && (
              <span className="rounded-full bg-danger/15 px-1.5 py-0.5 font-mono text-[10px] text-danger">
                {formatMoney(Math.abs(debtor.currentBalance))}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setTab("history")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "history" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_history")}
        </button>
        <button
          onClick={() => setTab("keys")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "keys" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_keys", { count: v.keys.length })}
        </button>
        <button
          onClick={() => setTab("documents")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "documents" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_documents")}
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "notes" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_notes")}
        </button>
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {v.status === "RENTED" && <RenterCard vehicle={v} />}
          {v.status === "WORKSHOP" && <WorkshopCard vehicle={v} />}

          <div className="panel p-6">
            <div className="label-eyebrow mb-3">{t("problem_desc_eyebrow")}</div>
            {editable ? (
              <>
                <textarea
                  value={problemDraft}
                  onChange={(e) => setProblemDraft(e.target.value)}
                  rows={5}
                  placeholder={t("problem_placeholder")}
                  className="w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan/50"
                />
                <button
                  onClick={saveProblem}
                  disabled={savingProblem}
                  className="mt-3 rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2 text-xs font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingProblem ? t("saving") : t("save")}
                </button>
              </>
            ) : (
              <p className="text-sm text-muted">
                {v.problemDescription || t("no_problems")}
              </p>
            )}
          </div>

          {/* Компактная карточка клиента — краткая сводка видна прямо в
              обзоре техники, полная информация о долге на соседней вкладке. */}
          <div className="panel p-6">
            <div className="label-eyebrow mb-3">{t("vehicle_header_client_eyebrow")}</div>
            {client ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-display text-base font-semibold text-ink">
                    {[client.firstName, client.lastName].filter(Boolean).join(" ") || "—"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="text-cyan transition-opacity hover:opacity-80">
                        {client.phone}
                      </a>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="text-cyan transition-opacity hover:opacity-80">
                        {client.email}
                      </a>
                    )}
                  </div>
                </div>
                {debtor ? (
                  <button
                    onClick={() => setTab("debt")}
                    className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition-opacity hover:opacity-90 ${
                      headerHasDebt
                        ? "border-violet/40 bg-gradient-to-br from-violet/25 via-violet/10 to-cyan/10 text-danger"
                        : "border-mint/40 bg-mintDim/40 text-mint"
                    }`}
                  >
                    {formatMoney(headerHasDebt ? headerTotalOwed : 0)}
                  </button>
                ) : (
                  client.id && (
                    <a
                      href={`/clients/${client.id}`}
                      className="text-xs text-violet transition-opacity hover:opacity-80"
                    >
                      {t("vehicle_debt_view_client_btn")}
                    </a>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">{t("vehicle_header_no_client")}</p>
            )}
          </div>
        </div>
      ) : tab === "debt" && client ? (
        <DebtTab client={client} debtor={debtor} editable={editable} />
      ) : tab === "history" ? (
        <div className="panel p-6">
          <div className="label-eyebrow mb-4">{t("status_history_eyebrow")}</div>
          <div className="space-y-4">
            {v.history.length === 0 && <p className="text-sm text-muted">{t("no_history")}</p>}
            {v.history.map((h) => {
              const c = STATUS_CONFIG[h.status];
              return (
                <div key={h.id} className="flex gap-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                  <div>
                    <div className="text-sm text-ink">
                      <span className={c.text}>{t(c.labelKey)}</span>
                      {h.note ? ` — ${h.note}` : ""}
                    </div>
                    <div className="text-[11px] text-faint">
                      {new Date(h.createdAt).toLocaleString(LOCALE_MAP[lang])}
                      {h.userName ? ` · ${h.userName}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === "documents" ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("documents_empty_title")}</div>
          <div className="max-w-sm text-xs text-muted">{t("documents_empty_subtitle")}</div>
        </div>
      ) : tab === "notes" ? (
        <NotesTab client={client} editable={editable} />
      ) : (
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="label-eyebrow">{t("keys_panel_eyebrow")}</div>
            {editable && (
              <button
                onClick={() => setAddingKey(true)}
                className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-3 py-1.5 text-xs font-medium text-cyan transition-opacity hover:opacity-90"
              >
                {t("add_key_btn")}
              </button>
            )}
          </div>

          {editable && <QuickAddKeys onAdd={quickAddKey} pending={quickAdding} />}

          {v.keys.length === 0 && !addingKey ? (
            <div className="flex flex-col items-center gap-1 py-14 text-center">
              <div className="text-sm text-ink">{t("board_empty_title")}</div>
              <div className="text-xs text-muted">{t("board_empty_subtitle")}</div>
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

      {rentModalOpen && (
        <RentVehicleModal
          saving={savingStatus}
          onClose={() => setRentModalOpen(false)}
          onSubmit={async (renterData) => {
            const fullName = `${renterData.firstName} ${renterData.lastName}`.trim();
            const ok = await changeStatus("RENTED", {
              renterFirstName: renterData.firstName,
              renterLastName: renterData.lastName,
              renterPhone: renterData.phone,
              renterEmail: renterData.email,
              note: t("rent_history_note", { name: fullName }),
            });
            if (ok) setRentModalOpen(false);
            return ok;
          }}
        />
      )}

      {workshopModalOpen && (
        <WorkshopVehicleModal
          saving={savingStatus}
          onClose={() => setWorkshopModalOpen(false)}
          onSubmit={async (workshopData) => {
            const ok = await changeStatus("WORKSHOP", {
              workshopDate: workshopData.date,
              workshopReason: workshopData.reason,
              workshopMileage: Number(workshopData.mileage),
              workshopCity: workshopData.city,
              note: t("workshop_history_note", { city: workshopData.city }),
            });
            if (ok) setWorkshopModalOpen(false);
            return ok;
          }}
        />
      )}
    </div>
  );
}

type DebtDetailItem = {
  id: number;
  date: string | null;
  vehicleName: string | null;
  reason: string | null;
  quota: number;
  remainingPayoff: number;
  comments: string | null;
};

type DebtDetailsResponse = {
  currentBalance: number;
  balanceWithDeposits: number | null;
  items: DebtDetailItem[];
  fetchedAt: string;
};

const REASON_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  TransportRent: "debtors_reason_transport_rent",
};

function reasonLabel(code: string | null, t: (key: TranslationKey) => string): string {
  if (!code) return t("debtors_debt_info_no_reason");
  const key = REASON_LABEL_KEYS[code];
  if (key) return t(key);
  return code.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

// Статус по строке задолженности выводим из реальных цифр ravapi.eu
// (сумма списания vs. остаток к оплате) — своего поля "статус" у элемента нет.
function itemStatus(item: DebtDetailItem): "paid" | "overdue" | "partial" {
  if (item.remainingPayoff <= 0) return "paid";
  if (item.remainingPayoff >= item.quota) return "overdue";
  return "partial";
}

const ITEM_STATUS_STYLE: Record<"paid" | "overdue" | "partial", { text: string; bg: string; labelKey: TranslationKey }> = {
  paid: { text: "text-mint", bg: "bg-mintDim/50", labelKey: "vehicle_debt_status_paid" },
  overdue: { text: "text-danger", bg: "bg-danger/10", labelKey: "vehicle_debt_status_overdue" },
  partial: { text: "text-amber", bg: "bg-amberDim/50", labelKey: "vehicle_debt_status_partial" },
};

function DebtTab({
  client,
  debtor,
  editable,
}: {
  client: VehicleClientInfo;
  debtor: VehicleDebtorInfo | null;
  editable: boolean;
}) {
  const { t, lang } = useTranslation();
  const [details, setDetails] = useState<DebtDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [notesDraft, setNotesDraft] = useState(debtor?.debtNotes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [contacted, setContacted] = useState(debtor?.isContactedForDebt || false);
  const [savingContacted, setSavingContacted] = useState(false);

  const [messages, setMessages] = useState(debtor?.messages || []);
  const [paymentsExpanded, setPaymentsExpanded] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderText, setReminderText] = useState(
    t("vehicle_debt_reminder_template").replace("{name}", client.firstName || "")
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function loadDetails() {
    if (!debtor) return;
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/debt-details`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDetailsError(body.error || t("debtors_debt_info_error"));
        return;
      }
      setDetails(body);
    } catch {
      setDetailsError(t("debtors_debt_info_error"));
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtor?.id]);

  async function saveNotes() {
    if (!debtor) return;
    setSavingNotes(true);
    const res = await fetch(`/api/debtors/${debtor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debtNotes: notesDraft }),
    });
    setSavingNotes(false);
    if (res.ok) setEditingNotes(false);
  }

  async function toggleContacted() {
    if (!debtor || !editable) return;
    const next = !contacted;
    setContacted(next);
    setSavingContacted(true);
    await fetch(`/api/debtors/${debtor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isContactedForDebt: next }),
    });
    setSavingContacted(false);
  }

  async function sendReminder() {
    if (!debtor || !reminderText.trim()) return;
    setSending(true);
    setSendError(null);
    setSent(false);
    try {
      const res = await fetch(`/api/debtors/${debtor.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reminderText }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(body.error || t("notify_send_failed"));
        return;
      }
      setMessages((prev) => [body, ...prev]);
      setContacted(true);
      setSent(true);
      setReminderOpen(false);
    } catch {
      setSendError(t("notify_send_failed"));
    } finally {
      setSending(false);
    }
  }

  const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ") || t("vehicle_debt_client_eyebrow");
  const hasDebt = debtor && debtor.currentBalance < 0;
  const totalOwed = debtor ? Math.abs(debtor.currentBalance) : 0;
  const paidSoFar =
    details && details.items.length
      ? details.items.reduce((sum, i) => sum + Math.max(0, i.quota - i.remainingPayoff), 0)
      : null;
  const totalCharged = details && details.items.length ? details.items.reduce((sum, i) => sum + i.quota, 0) : null;
  // "Спорные" (disputed) — в источнике данных ravapi.eu нет отдельного статуса
  // спора, поэтому пока всегда 0; сумма при этом сходится: просрочено + оплачено = долг.
  const disputedAmount = 0;
  const paidItems = details ? details.items.filter((i) => itemStatus(i) === "paid" && i.date) : [];
  const sortedPaidItems = [...paidItems].sort(
    (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
  );
  const visiblePayments = paymentsExpanded ? sortedPaidItems : sortedPaidItems.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Клиент + общая сумма долга */}
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-6 lg:col-span-3">
        <div>
          <div className="label-eyebrow mb-1">{t("vehicle_debt_client_eyebrow")}</div>
          <div className="font-display text-lg font-semibold text-ink">{fullName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="text-cyan transition-opacity hover:opacity-80">
                {client.phone}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="text-cyan transition-opacity hover:opacity-80">
                {client.email}
              </a>
            )}
            {client.id && (
              <a href={`/clients/${client.id}`} className="text-violet transition-opacity hover:opacity-80">
                {t("vehicle_debt_view_client_btn")}
              </a>
            )}
          </div>
        </div>

        {debtor ? (
          <div
            className={`flex items-center gap-4 rounded-2xl border px-5 py-3.5 shadow-glowViolet ${
              hasDebt ? "border-violet/40 bg-gradient-to-br from-violet/20 via-violet/10 to-cyan/10" : "border-mint/40 bg-mintDim/40"
            }`}
          >
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted">{t("vehicle_debt_total_label")}</div>
              <div className={`font-display text-2xl font-bold ${hasDebt ? "text-danger" : "text-mint"}`}>
                {hasDebt ? formatMoney(totalOwed) : formatMoney(0)}
              </div>
              <div className="mt-0.5 text-[10px] text-faint">
                {t("vehicle_debt_updated_label")}: {new Date(debtor.lastSyncedAt).toLocaleString(LOCALE_MAP[lang])}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-mint/40 bg-mintDim/40 px-5 py-3.5">
            <div className="text-sm font-medium text-mint">{t("vehicle_debt_no_debtor_title")}</div>
          </div>
        )}
      </div>

      {debtor && (
        <>
          {/* Разбивка */}
          <div className="panel grid grid-cols-2 divide-y divide-line p-0 sm:grid-cols-4 sm:divide-x sm:divide-y-0 lg:col-span-3">
            <div className="px-5 py-4">
              <div className="label-eyebrow">{t("vehicle_debt_breakdown_total")}</div>
              <div className="mt-1 font-display text-xl font-semibold text-ink">
                {totalCharged != null ? formatMoney(totalCharged) : "—"}
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="label-eyebrow">{t("vehicle_debt_overdue_label")}</div>
              <div className="mt-1 font-display text-xl font-semibold text-danger">{formatMoney(totalOwed)}</div>
            </div>
            <div className="px-5 py-4">
              <div className="label-eyebrow">{t("vehicle_debt_breakdown_paid")}</div>
              <div className="mt-1 font-display text-xl font-semibold text-mint">
                {paidSoFar != null ? formatMoney(paidSoFar) : "—"}
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="label-eyebrow">{t("vehicle_debt_disputed_label")}</div>
              <div className="mt-1 font-display text-xl font-semibold text-amber">{formatMoney(disputedAmount)}</div>
            </div>
          </div>

          {/* Расшифровка задолженности */}
          <div className="panel p-6 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="label-eyebrow">{t("debtors_debt_info_title")}</div>
              {!loadingDetails && (
                <button
                  onClick={loadDetails}
                  className="text-[11px] text-cyan transition-opacity hover:opacity-80"
                >
                  {t("debtors_debt_info_retry")}
                </button>
              )}
            </div>
            <div className="mb-3 text-[11px] text-faint">{t("vehicle_debt_synced_note")}</div>

            {loadingDetails && <div className="py-8 text-sm text-muted">{t("debtors_debt_info_loading")}</div>}

            {!loadingDetails && detailsError && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {detailsError}
              </div>
            )}

            {!loadingDetails && !detailsError && details && (
              <>
                {details.items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">{t("debtors_debt_info_empty")}</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto rounded-xl border border-line scrollbar-thin">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line bg-bg2 text-muted">
                          <th className="px-3 py-2 font-medium">{t("vehicle_debt_col_description")}</th>
                          <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_date")}</th>
                          <th className="px-3 py-2 font-medium">{t("vehicle_debt_col_type")}</th>
                          <th className="px-3 py-2 font-medium">{t("debtors_debt_info_col_amount")}</th>
                          <th className="px-3 py-2 font-medium">{t("vehicle_debt_col_status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.items.map((item) => {
                          const st = itemStatus(item);
                          const style = ITEM_STATUS_STYLE[st];
                          const label = reasonLabel(item.reason, t);
                          const shortType = label.split(" ")[0];
                          return (
                            <tr key={item.id} className="border-b border-line/60 last:border-0">
                              <td className="px-3 py-2 text-ink">
                                {label}
                                <div className="mt-0.5 text-[11px] text-faint">
                                  {item.comments || item.vehicleName || "—"}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted">
                                {item.date ? new Date(item.date).toLocaleDateString(LOCALE_MAP[lang]) : "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-muted">{shortType}</td>
                              <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">
                                {formatMoney(item.quota)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                                  {t(style.labelKey)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* История оплат — производные данные из погашенных строк задолженности */}
          <div className="panel p-6 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="label-eyebrow">{t("vehicle_debt_payments_eyebrow")}</div>
              {sortedPaidItems.length > 5 && (
                <button
                  onClick={() => setPaymentsExpanded((v) => !v)}
                  className="text-[11px] text-cyan transition-opacity hover:opacity-80"
                >
                  {paymentsExpanded ? t("cancel") : t("vehicle_debt_payments_show_all")}
                </button>
              )}
            </div>
            <div className="mb-3 text-[11px] text-faint">{t("vehicle_debt_payments_subtitle")}</div>

            {sortedPaidItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted">{t("vehicle_debt_payments_empty")}</div>
            ) : (
              <div className="space-y-3">
                {visiblePayments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/60 px-3 py-2.5"
                  >
                    <div>
                      <div className="text-xs text-ink">{reasonLabel(item.reason, t)}</div>
                      <div className="text-[11px] text-faint">
                        {item.date ? new Date(item.date).toLocaleString(LOCALE_MAP[lang]) : "—"} ·{" "}
                        {t("vehicle_debt_payment_method")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-ink">{formatMoney(item.quota)}</span>
                      <span className="rounded-full bg-mintDim/50 px-2 py-0.5 text-[10px] font-medium text-mint">
                        {t("vehicle_debt_status_paid")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Заметка + связаться с клиентом */}
          <div className="flex flex-col gap-5">
            <div className="panel p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="label-eyebrow">{t("vehicle_debt_notes_eyebrow")}</div>
                {editable && !editingNotes && (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-[11px] text-cyan transition-opacity hover:opacity-80"
                  >
                    {debtor.debtNotes ? t("edit") : t("add")}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div>
                  <textarea
                    autoFocus
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    placeholder={t("debtors_notes_placeholder")}
                    className="w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-3 py-1.5 text-xs font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {savingNotes ? t("saving") : t("save")}
                    </button>
                    <button
                      onClick={() => {
                        setNotesDraft(debtor.debtNotes || "");
                        setEditingNotes(false);
                      }}
                      className="text-xs text-muted transition-colors hover:text-ink"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">{debtor.debtNotes || "—"}</p>
              )}

              <label className="mt-4 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={contacted}
                  disabled={!editable || savingContacted}
                  onChange={toggleContacted}
                  className="h-3.5 w-3.5 rounded border-line accent-violet"
                />
                {t("vehicle_debt_contacted_label")}
              </label>
            </div>

            <div className="panel p-6">
              <div className="label-eyebrow mb-3">{t("vehicle_debt_history_eyebrow")}</div>
              <div className="max-h-52 space-y-3 overflow-y-auto scrollbar-thin pr-1">
                {messages.length === 0 && <p className="text-sm text-muted">{t("vehicle_debt_no_messages")}</p>}
                {messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <div className="flex items-center justify-between text-faint">
                      <span>{new Date(m.createdAt).toLocaleString(LOCALE_MAP[lang])}</span>
                      <span className={m.status === "SENT" ? "text-mint" : "text-danger"}>
                        {m.status === "SENT" ? t("notify_status_sent") : t("notify_status_failed")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-ink">{m.body}</p>
                  </div>
                ))}
              </div>

              {editable && (
                <>
                  {reminderOpen ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <textarea
                        autoFocus
                        value={reminderText}
                        onChange={(e) => setReminderText(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
                      />
                      {sendError && <div className="mt-1.5 text-[11px] text-danger">{sendError}</div>}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={sendReminder}
                          disabled={sending}
                          className="flex-1 rounded-lg bg-violet py-2 text-xs font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {sending ? t("notify_sending") : t("vehicle_debt_send_reminder")}
                        </button>
                        <button
                          onClick={() => setReminderOpen(false)}
                          className="rounded-lg border border-line px-3 py-2 text-xs text-muted transition-colors hover:text-ink"
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReminderOpen(true)}
                      className="mt-4 w-full rounded-lg bg-violet py-2.5 text-xs font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90"
                    >
                      {t("vehicle_debt_call_client")}
                    </button>
                  )}
                  {sent && <div className="mt-2 text-center text-[11px] text-mint">{t("notify_sent_ok")}</div>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotesTab({ client, editable }: { client: VehicleClientInfo | null; editable: boolean }) {
  const { t } = useTranslation();
  const [notesDraft, setNotesDraft] = useState(client?.notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!client?.id) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (!client) {
    return (
      <div className="panel flex flex-col items-center gap-1 py-14 text-center">
        <div className="text-sm text-ink">{t("notes_no_client_title")}</div>
        <div className="max-w-sm text-xs text-muted">{t("notes_no_client_subtitle")}</div>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div className="mb-1 flex items-center justify-between">
        <div className="label-eyebrow">{t("notes_client_eyebrow")}</div>
        <div className="text-xs text-muted">
          {[client.firstName, client.lastName].filter(Boolean).join(" ")}
        </div>
      </div>
      {client.id ? (
        <>
          <textarea
            value={notesDraft}
            onChange={(e) => {
              setNotesDraft(e.target.value);
              setSaved(false);
            }}
            disabled={!editable}
            rows={8}
            placeholder={t("notes_placeholder")}
            className="mt-3 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan/50 disabled:opacity-70"
          />
          {editable && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2 text-xs font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? t("saving") : t("save")}
              </button>
              {saved && <span className="text-[11px] text-mint">{t("notes_saved_note")}</span>}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">{client.notes || "—"}</p>
      )}
    </div>
  );
}

function RenterCard({ vehicle }: { vehicle: VehicleFull }) {
  const { t } = useTranslation();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasData = Boolean(
    vehicle.renterFirstName || vehicle.renterLastName || vehicle.renter || vehicle.renterPhone || vehicle.renterEmail
  );

  const firstName = vehicle.renterFirstName || (!vehicle.renterLastName ? vehicle.renter : "") || "";
  const lastName = vehicle.renterLastName || "";

  async function copy(field: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopiedField(field);
    window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1800);
  }

  const fields: { key: string; labelKey: TranslationKey; copiedKey: TranslationKey; value: string }[] = [
    { key: "firstName", labelKey: "renter_card_first_name", copiedKey: "renter_card_first_name_copied", value: firstName },
    { key: "lastName", labelKey: "renter_card_last_name", copiedKey: "renter_card_last_name_copied", value: lastName },
    { key: "phone", labelKey: "renter_card_phone", copiedKey: "renter_card_phone_copied", value: vehicle.renterPhone || "" },
    { key: "email", labelKey: "renter_card_email", copiedKey: "renter_card_email_copied", value: vehicle.renterEmail || "" },
  ];

  return (
    <div className="panel p-6 lg:col-span-2">
      <div className="label-eyebrow mb-3">{t("renter_card_eyebrow")}</div>
      {!hasData ? (
        <p className="text-sm text-muted">{t("renter_card_empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fields.map((f) => (
            <div key={f.key}>
              <div className="text-[11px] text-faint">{t(f.labelKey)}</div>
              {f.value ? (
                <button
                  type="button"
                  onClick={() => copy(f.key, f.value)}
                  title={t("renter_card_copy_hint")}
                  className="mt-0.5 block max-w-full truncate text-left text-sm text-cyan transition-opacity hover:opacity-80"
                >
                  {f.value}
                </button>
              ) : (
                <div className="mt-0.5 text-sm text-ink">—</div>
              )}
              <div
                className={`mt-1 text-[11px] text-mint transition-opacity ${
                  copiedField === f.key ? "opacity-100" : "opacity-0"
                }`}
              >
                {t(f.copiedKey)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkshopCard({ vehicle }: { vehicle: VehicleFull }) {
  const { t, lang } = useTranslation();
  const hasData = Boolean(
    vehicle.workshopDate || vehicle.workshopReason || vehicle.workshopMileage != null || vehicle.workshopCity
  );

  return (
    <div className="panel p-6 lg:col-span-2">
      <div className="label-eyebrow mb-3">{t("workshop_card_eyebrow")}</div>
      {!hasData ? (
        <p className="text-sm text-muted">{t("workshop_card_empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-faint">{t("workshop_card_date")}</div>
            <div className="mt-0.5 text-sm text-ink">
              {vehicle.workshopDate ? new Date(vehicle.workshopDate).toLocaleDateString(LOCALE_MAP[lang]) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-faint">{t("workshop_card_mileage")}</div>
            <div className="mt-0.5 text-sm text-ink">
              {vehicle.workshopMileage != null ? `${vehicle.workshopMileage} ${t("workshop_card_mileage_unit")}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-faint">{t("workshop_card_city")}</div>
            <div className="mt-0.5 text-sm text-ink">{vehicle.workshopCity || "—"}</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] text-faint">{t("workshop_card_reason")}</div>
            <div className="mt-0.5 text-sm text-ink">{vehicle.workshopReason || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAddKeys({
  onAdd,
  pending,
}: {
  onAdd: (label: string, isDuplicate: boolean) => Promise<void>;
  pending: string | null;
}) {
  const { t } = useTranslation();
  const [asDuplicate, setAsDuplicate] = useState(false);

  return (
    <div className="mb-5 rounded-xl border border-line/60 bg-panel p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="label-eyebrow">{t("quick_add_eyebrow")}</div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted">
          <input
            type="checkbox"
            checked={asDuplicate}
            onChange={(e) => setAsDuplicate(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line accent-cyan"
          />
          {t("quick_add_duplicate_hint")}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {KEY_PRESETS.map((presetKey) => {
          const label = t(presetKey);
          const busy = pending === label + (asDuplicate ? ":dup" : "");
          return (
            <button
              key={presetKey}
              type="button"
              disabled={pending !== null}
              onClick={() => onAdd(label, asDuplicate)}
              title={t("quick_add_hint")}
              className="rounded-lg border border-line bg-bg2 px-3 py-1.5 text-xs text-ink transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
            >
              {busy ? "…" : `+ ${label}`}
            </button>
          );
        })}
      </div>
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
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState<string>(KEY_PRESETS[0]);
  const [customLabel, setCustomLabel] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [holder, setHolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCustom = selectedPreset === "custom";
  const label = isCustom ? customLabel : t(selectedPreset as (typeof KEY_PRESETS)[number]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError(t("key_create_failed"));
      return;
    }
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
      setError(data.error || t("key_create_failed"));
      return;
    }
    const key = await res.json();
    onCreated(key);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_key_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_key_name")}</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {KEY_PRESETS.map((presetKey) => (
            <button
              type="button"
              key={presetKey}
              onClick={() => setSelectedPreset(presetKey)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                selectedPreset === presetKey
                  ? "border-cyan/40 bg-cyanDim/40 text-cyan"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {t(presetKey)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedPreset("custom")}
            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
              isCustom ? "border-cyan/40 bg-cyanDim/40 text-cyan" : "border-line text-muted hover:text-ink"
            }`}
          >
            {t("key_preset_custom")}
          </button>
        </div>

        {isCustom && (
          <input
            required
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder={t("key_custom_placeholder")}
            className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
          />
        )}

        <label className="mb-1 block label-eyebrow">{t("field_key_holder")}</label>
        <input
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder={t("key_holder_placeholder2")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-5 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isDuplicate}
            onChange={(e) => setIsDuplicate(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-cyan"
          />
          {t("field_duplicate")}
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
          {loading ? t("creating") : t("add_to_board")}
        </button>
      </form>
    </div>
  );
}

function RentVehicleModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (data: { firstName: string; lastName: string; phone: string; email: string }) => Promise<boolean | void>;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      setError(t("rent_fill_all_fields"));
      return;
    }
    setError(null);
    const ok = await onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() });
    if (ok === false) setError(t("rent_save_failed"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("rent_modal_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-5 text-xs text-muted">{t("rent_modal_subtitle")}</p>

        <label className="mb-1 block label-eyebrow">{t("field_renter_first_name")}</label>
        <input
          required
          autoFocus
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t("renter_first_name_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
        <input
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t("renter_last_name_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_renter_phone")}</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("renter_phone_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_renter_email")}</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("renter_email_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg border border-violet/40 bg-violetDim/40 py-2.5 text-sm font-medium text-violet transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("rent_confirm_btn")}
        </button>
      </form>
    </div>
  );
}

function WorkshopVehicleModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (data: { date: string; reason: string; mileage: string; city: string }) => Promise<boolean | void>;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayIso);
  const [reason, setReason] = useState("");
  const [mileage, setMileage] = useState("");
  const [city, setCity] = useState(WORKSHOP_CITIES[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !reason.trim() || !mileage.trim() || !city.trim()) {
      setError(t("workshop_fill_all_fields"));
      return;
    }
    if (Number.isNaN(Number(mileage)) || Number(mileage) < 0) {
      setError(t("workshop_mileage_invalid"));
      return;
    }
    setError(null);
    const ok = await onSubmit({ date, reason: reason.trim(), mileage: mileage.trim(), city });
    if (ok === false) setError(t("workshop_save_failed"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("workshop_modal_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-5 text-xs text-muted">{t("workshop_modal_subtitle")}</p>

        <label className="mb-1 block label-eyebrow">{t("field_workshop_date")}</label>
        <input
          required
          autoFocus
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-amber/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_workshop_city")}</label>
        <select
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-amber/50"
        >
          {WORKSHOP_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("field_workshop_mileage")}</label>
        <input
          required
          type="number"
          min={0}
          inputMode="numeric"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          placeholder={t("workshop_mileage_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-amber/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_workshop_reason")}</label>
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("workshop_reason_placeholder")}
          className="mb-4 w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-amber/50"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg border border-amber/40 bg-amberDim/40 py-2.5 text-sm font-medium text-amber transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("workshop_confirm_btn")}
        </button>
      </form>
    </div>
  );
}
