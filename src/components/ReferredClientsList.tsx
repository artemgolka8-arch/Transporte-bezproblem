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
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}\u00A0zł`;
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

const AVATAR_PALETTE = [
  { bg: "bg-mintDim/70", text: "text-mint" },
  { bg: "bg-cyanDim/70", text: "text-cyan" },
  { bg: "bg-violetDim/70", text: "text-violet" },
  { bg: "bg-amberDim/70", text: "text-amber" },
];

function avatarStyle(seed: string) {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 4.5c.3 3.9 1.9 7.5 4.7 10.3 2.8 2.8 6.4 4.4 10.3 4.7l.6-3.4-4-1.6-1.6 1.8a13 13 0 0 1-6.4-6.4l1.8-1.6-1.6-4Z" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ChevronRightSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.7 4.5 5.7v5.4c0 4.8 3.2 7.8 7.5 9.9 4.3-2.1 7.5-5.1 7.5-9.9V5.7Z" />
    </svg>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function ReferredClientsList({ referred, role }: { referred: ReferredRow[]; role: Role }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [rows, setRows] = useState<ReferredRow[]>(referred);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [payoutRowId, setPayoutRowId] = useState<string | null>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function deleteRow(id: string) {
    if (!confirm(t("delete_referred_confirm"))) return;
    const res = await fetch(`/api/referred-clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMenuRowId(null);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-semibold text-ink">{t("referred_title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("referred_empty_subtitle")}</p>
        </div>
        {editable && (
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-violet px-4 py-2.5 text-sm font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            {t("new_referred_btn")}
          </button>
        )}
      </div>

      <div className="relative mb-5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("referred_search_placeholder")}
          className="w-full rounded-xl border border-line bg-bg2 py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-violet/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("referred_empty_title")}</div>
          <div className="text-xs text-muted">{t("referred_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client_phone")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_invitation_type")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_city")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_client_vehicle")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">
                    <span className="inline-flex items-center gap-1">{t("col_payout")}<SortIcon /></span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-medium text-muted">{t("actions_label")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
                  const avatar = avatarStyle(r.firstName);
                  return (
                    <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}>
                            {initials(r.firstName, r.lastName)}
                          </span>
                          <span className="font-medium text-ink">
                            {r.firstName} {r.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`tel:${r.phone.replace(/\s+/g, "")}`}
                          className="inline-flex items-center gap-1.5 text-ink transition-colors hover:text-violet"
                        >
                          {r.phone}
                          <span className="text-faint"><PhoneIcon /></span>
                        </a>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full border border-amber/30 bg-amberDim/50 px-2.5 py-1 text-[11px] font-medium text-amber">
                          {t(INVITATION_LABEL_KEYS[r.invitationType])}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{r.city}</td>
                      <td className="px-5 py-3.5">
                        {r.vehicles.length === 0 ? (
                          <span className="text-xs text-faint">{t("clients_not_renting")}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {r.vehicles.map((v) => (
                              <span
                                key={v.id}
                                className="rounded-lg bg-violetDim/60 px-2.5 py-1 text-[12px] font-medium text-violet"
                              >
                                {v.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setPayoutRowId(r.id)}
                          className={
                            r.payoutTotal > 0
                              ? "whitespace-nowrap rounded-lg border border-mint/40 bg-mintDim/40 px-3 py-1.5 text-[12px] font-medium text-mint transition-opacity hover:opacity-80"
                              : "whitespace-nowrap rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-violet/40 hover:text-violet"
                          }
                        >
                          {r.payoutTotal > 0 ? formatMoney(r.payoutTotal) : `+ ${t("payout_label")}`}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="relative">
                          <button
                            onClick={() => setMenuRowId(menuRowId === r.id ? null : r.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet"
                            aria-label={t("actions_label")}
                          >
                            <DotsIcon />
                          </button>
                          {menuRowId === r.id && (
                            <div className="panel absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden p-1">
                              <button
                                onClick={() => {
                                  setPayoutRowId(r.id);
                                  setMenuRowId(null);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-ink hover:bg-panel2/70"
                              >
                                {t("payout_label")}
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => deleteRow(r.id)}
                                  className="block w-full rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                                >
                                  {t("delete_task_btn")}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
            <div className="text-xs text-muted">
              {t("total_clients_label")}: {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
              >
                <ChevronLeftIcon />
              </button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-violet/40 px-2 text-xs font-medium text-violet">
                {currentPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-violet/40 hover:text-violet disabled:opacity-40"
              >
                <ChevronRightSmallIcon />
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-lg border border-line bg-bg2 px-2 text-xs text-ink outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} {t("per_page_label")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-faint">
        <ShieldIcon />
        {t("footer_security_note")}
      </div>

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
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("renter_last_name_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
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
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
        />

        <label className="mb-1 block label-eyebrow">{t("field_invitation_type")}</label>
        <select
          value={invitationType}
          onChange={(e) => setInvitationType(e.target.value as InvitationType)}
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
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
          className="mb-4 w-full rounded-lg border border-line bg-bg2 px-3 py-2 text-sm text-ink outline-none focus:border-violet/50"
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
          className="w-full rounded-xl bg-violet py-2.5 text-sm font-medium text-white shadow-glowViolet transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
