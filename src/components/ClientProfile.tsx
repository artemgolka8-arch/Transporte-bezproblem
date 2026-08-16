"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, VehicleStatus } from "./status";
import { canEdit, isAdmin } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Lang } from "@/lib/i18n/translations";

type ClientVehicle = {
  id: string;
  code: string;
  name: string;
  status: VehicleStatus;
  imageUrl: string | null;
  rentedUntil: string | null;
};

type ClientData = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  vehicles: ClientVehicle[];
};

const LOCALE_MAP: Record<Lang, string> = { ru: "ru-RU", pl: "pl-PL", uk: "uk-UA" };

export function ClientProfile({
  client,
  role,
}: {
  client: ClientData;
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const editable = canEdit(role);
  const admin = isAdmin(role);

  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email || "");
  const [notes, setNotes] = useState(client.notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError(t("clients_fill_required"));
      return;
    }
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, email, notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("save_failed"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function removeClient() {
    if (!confirm(t("delete_client_confirm"))) return;
    setDeleting(true);
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    } else {
      setDeleting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("delete_failed"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/clients")}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          {t("back_to_clients")}
        </button>

        {admin && (
          <button
            onClick={removeClient}
            disabled={deleting}
            className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {deleting ? t("deleting") : t("delete_client_btn")}
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="label-eyebrow mb-1">{t("client_profile_eyebrow")}</div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {client.firstName} {client.lastName}
        </h1>
        <p className="mt-1 text-xs text-faint">
          {t("client_since", { date: new Date(client.createdAt).toLocaleDateString(LOCALE_MAP[lang]) })}
        </p>
      </div>

      <form onSubmit={save} className="panel p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_first_name")}</label>
            <input
              required
              disabled={!editable}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              disabled={!editable}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_phone")}</label>
            <input
              required
              type="tel"
              disabled={!editable}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block label-eyebrow">{t("field_renter_email")}</label>
            <input
              type="email"
              disabled={!editable}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("renter_email_placeholder")}
              className="w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block label-eyebrow">{t("field_client_notes")}</label>
          <textarea
            disabled={!editable}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("client_notes_placeholder")}
            className="w-full resize-none rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/50 disabled:opacity-60"
          />
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="mt-5 rounded-lg border border-mint/30 bg-mintDim/20 px-3 py-2 text-xs text-mint">
            {t("client_updated")}
          </div>
        )}

        {editable && (
          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-lg border border-cyan/40 bg-cyanDim/40 px-5 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("saving") : t("save_changes")}
          </button>
        )}
      </form>

      <div className="mt-6">
        <div className="label-eyebrow mb-3">{t("client_vehicles_eyebrow")}</div>
        {client.vehicles.length === 0 ? (
          <div className="panel p-6 text-sm text-muted">{t("client_vehicles_empty")}</div>
        ) : (
          <div className="space-y-2.5">
            {client.vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => router.push(`/vehicle/${v.id}`)}
                className="panel flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-panel2/60"
              >
                <div>
                  <div className="text-sm text-ink">{v.name}</div>
                  <div className="font-mono text-xs text-faint">{v.code}</div>
                </div>
                <StatusBadge status={v.status} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
