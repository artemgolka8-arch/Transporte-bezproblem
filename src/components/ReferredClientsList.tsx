"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit, isAdmin, Role } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { TranslationKey } from "@/lib/i18n/translations";

type ReferredVehicle = { id: string; code: string; name: string };

type Payout = {
  id: string;
  amount: number;
  note: string | null;
  createdByName: string | null;
  createdAt: string;
};

type InvitationType = "FLEET_PARTNER" | "RENT" | "FLEET_PARTNER_RENT";

const INVITATION_TYPES: InvitationType[] = ["FLEET_PARTNER", "RENT", "FLEET_PARTNER_RENT"];
const INVITATION_LABEL_KEYS: Record<InvitationType, TranslationKey> = {
  FLEET_PARTNER: "invitation_fleet_partner",
  RENT: "invitation_rent",
  FLEET_PARTNER_RENT: "invitation_fleet_partner_rent",
};

const CITIES = ["Wrocław", "Warszawa", "Kraków", "Gdańsk", "Poznań", "Katowice", "Łódź", "Praha"];

type ReferredRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  invitationType: InvitationType;
  city: string;
  vehicles: ReferredVehicle[];
  payouts: Payout[];
  payoutTotal: number;
};

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} zł`;
}

export function ReferredClientsList({ referred, role }: { referred: ReferredRow[]; role: Role }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReferredRow[]>(referred);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [payoutRowId, setPayoutRowId] = useState<string | null>(null);
  const editable = canEdit(role);
  const canDelete = isAdmin(role);
  const payoutRow = rows.find((r) => r.id === payoutRowId) || null;

  function updateRowPayouts(id: string, payouts: Payout[]) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, payouts, payoutTotal: payouts.reduce((s, p) => s + p.amount, 0) } : r
      )
    );
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = `${r.firstName} ${r.lastName} ${r.phone} ${r.city}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query]);

  async function deleteRow(id: string) {
    if (!confirm(t("delete_referred_confirm"))) return;
    const res = await fetch(`/api/referred-clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-eyebrow mb-1">{t("referred_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("referred_title")}</h1>
        </div>
        {editable && (
          <button
            onClick={() => setFormOpen(true)}
            className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
          >
            {t("new_referred_btn")}
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("referred_search_placeholder")}
        className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan/50"
      />

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("referred_empty_title")}</div>
          <div className="text-xs text-muted">{t("referred_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_name")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_phone")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_invitation_type")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_city")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_vehicle")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_payout")}</th>
                {canDelete && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/60">
                  <td className="px-5 py-3 text-ink">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{r.phone}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md border border-amber/40 bg-amberDim/40 px-2 py-0.5 text-[11px] text-amber">
                      {t(INVITATION_LABEL_KEYS[r.invitationType])}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">{r.city}</td>
                  <td className="px-5 py-3">
                    {r.vehicles.length === 0 ? (
                      <span className="text-xs text-faint">{t("clients_not_renting")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.vehicles.map((v) => (
                          <span
                            key={v.id}
                            className="rounded-md border border-violet/40 bg-violetDim/40 px-2 py-0.5 text-[11px] text-violet"
                          >
                            {v.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setPayoutRowId(r.id)}
                      className={
                        r.payoutTotal > 0
                          ? "rounded-md border border-mint/40 bg-mintDim/40 px-2 py-0.5 text-[11px] text-mint transition-opacity hover:opacity-80"
                          : "rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-mint/40 hover:text-mint"
                      }
                    >
                      {r.payoutTotal > 0 ? `${t("payout_label")}: ${formatMoney(r.payoutTotal)}` : `+ ${t("payout_label")}`}
                    </button>
                  </td>
                  {canDelete && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => deleteRow(r.id)}
                        className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger transition-colors hover:bg-danger/10"
                      >
                        {t("delete_task_btn")}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <NewReferredModal
          onClose={() => setFormOpen(false)}
          onCreated={(row) => {
            setFormOpen(false);
            setRows((prev) => [row, ...prev]);
            router.refresh();
          }}
        />
      )}

      {payoutRow && (
        <PayoutModal
          row={payoutRow}
          editable={editable}
          canDelete={canDelete}
          onClose={() => setPayoutRowId(null)}
          onChange={(payouts) => updateRowPayouts(payoutRow.id, payouts)}
        />
      )}
    </div>
  );
}

function PayoutModal({
  row,
  editable,
  canDelete,
  onClose,
  onChange,
}: {
  row: ReferredRow;
  editable: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChange: (payouts: Payout[]) => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("payout_amount_invalid"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/referred-clients/${row.id}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, note: note.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const payout: Payout = await res.json();
    onChange([payout, ...row.payouts]);
    setAmount("");
    setNote("");
  }

  async function removePayout(id: string) {
    if (!confirm(t("delete_payout_confirm"))) return;
    const res = await fetch(`/api/referred-clients/${row.id}/payouts/${id}`, { method: "DELETE" });
    if (res.ok) {
      onChange(row.payouts.filter((p) => p.id !== id));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("payout_label")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <div className="mb-4 text-xs text-muted">
          {row.firstName} {row.lastName}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-mint/40 bg-mintDim/40 px-3 py-2">
          <span className="text-xs text-muted">{t("payout_total")}</span>
          <span className="font-display text-base font-semibold text-mint">{formatMoney(row.payoutTotal)}</span>
        </div>

        {row.payouts.length > 0 && (
          <div className="mb-4 max-h-48 space-y-1.5 overflow-y-auto">
            {row.payouts.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-line bg-bg2 px-3 py-2 text-xs"
              >
                <div>
                  <div className="text-ink">{formatMoney(p.amount)}</div>
                  {p.note && <div className="text-faint">{p.note}</div>}
                  <div className="text-faint">
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.createdByName ? ` · ${p.createdByName}` : ""}
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => removePayout(p.id)}
                    className="text-danger hover:opacity-80"
                    title={t("delete_action")}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {editable && (
          <form onSubmit={submit}>
            <label className="mb-1 block label-eyebrow">{t("payout_amount_label")}</label>
            <input
              required
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="mb-3 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-mint/50"
            />
            <label className="mb-1 block label-eyebrow">
              {t("payout_note_label")} <span className="text-faint">({t("optional")})</span>
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("payout_note_placeholder")}
              className="mb-3 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-mint/50"
            />

            {error && (
              <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-mint/40 bg-mintDim/40 py-2.5 text-sm font-medium text-mint transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t("saving") : t("payout_add_btn")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function NewReferredModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: ReferredRow) => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [invitationType, setInvitationType] = useState<InvitationType>("FLEET_PARTNER");
  const [city, setCity] = useState(CITIES[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(t("clients_fill_required"));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/referred-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, invitationType, city }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const row = await res.json();
    onCreated(row);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_referred_title")}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_first_name")}</label>
            <input
              required
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("renter_first_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("renter_last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
            />
          </div>
        </div>

        <label className="mb-1 block label-eyebrow">{t("field_renter_phone")}</label>
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("renter_phone_placeholder")}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_invitation_type")}</label>
        <select
          value={invitationType}
          onChange={(e) => setInvitationType(e.target.value as InvitationType)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {INVITATION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(INVITATION_LABEL_KEYS[type])}
            </option>
          ))}
        </select>

        <label className="mb-1 block label-eyebrow">{t("field_city")}</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-cyan/50"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
