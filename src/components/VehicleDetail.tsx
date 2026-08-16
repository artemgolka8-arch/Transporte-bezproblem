"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusRing } from "./StatusRing";
import { StatusBadge, STATUS_CONFIG, VehicleStatus } from "./status";
import { KeyPeg, KeyData } from "./KeyPeg";
import { BRAND_LABEL_KEYS, VehicleBrand } from "./VehicleCard";
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
  name: string;
  type: "BIKE" | "SCOOTER";
  status: VehicleStatus;
  brand: VehicleBrand | null;
  city: string | null;
  imageUrl: string | null;
  problemDescription: string | null;
  location: string | null;
  renter: string | null;
  renterFirstName: string | null;
  renterLastName: string | null;
  renterPhone: string | null;
  renterEmail: string | null;
  keys: KeyData[];
  history: HistoryEntry[];
};

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

const KEY_PRESETS = [
  "key_preset_a",
  "key_preset_b",
  "key_preset_ignition",
  "key_preset_lock",
] as const;

export function VehicleDetail({
  vehicle,
  role,
}: {
  vehicle: VehicleFull;
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState<"overview" | "keys">("overview");
  const [v, setV] = useState(vehicle);
  const [problemDraft, setProblemDraft] = useState(vehicle.problemDescription || "");
  const [savingProblem, setSavingProblem] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rentModalOpen, setRentModalOpen] = useState(false);
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
        <StatusRing status={v.status} type={v.type} brand={v.brand} imageUrl={v.imageUrl} size={72} />
        <div className="flex-1 min-w-[200px]">
          <div className="font-mono text-xs text-faint">{v.code}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{v.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={v.status} />
            {v.brand && <span className="text-xs text-muted">· {t(BRAND_LABEL_KEYS[v.brand])}</span>}
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
      </div>

      <div className="mb-5 flex items-center gap-1 rounded-lg border border-line bg-panel p-1 w-fit">
        <button
          onClick={() => setTab("overview")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "overview" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_overview")}
        </button>
        <button
          onClick={() => setTab("keys")}
          className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
            tab === "keys" ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t("tab_keys", { count: v.keys.length })}
        </button>
      </div>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {v.status === "RENTED" && <RenterCard vehicle={v} />}

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

          <div className="panel p-6">
            <div className="label-eyebrow mb-3">{t("status_history_eyebrow")}</div>
            <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin pr-1">
              {v.history.length === 0 && (
                <p className="text-sm text-muted">{t("no_history")}</p>
              )}
              {v.history.map((h) => {
                const c = STATUS_CONFIG[h.status];
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
                    <div>
                      <div className="text-xs text-ink">
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
        </div>
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
