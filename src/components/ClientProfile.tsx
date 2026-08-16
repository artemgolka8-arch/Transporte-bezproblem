"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, VehicleStatus } from "./status";
import { canEdit, isAdmin } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Lang } from "@/lib/i18n/translations";
import { ProfileHeader } from "@/components/ProfileHeader";

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

const FIELD_CLASS =
  "w-full border-b border-line bg-transparent px-0 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-cyan disabled:opacity-50";

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

  const activeCount = client.vehicles.filter((v) => v.status === "RENTED").length;
  const initials = (client.firstName[0] || "?") + (client.lastName[0] || "");
  const sinceDate = new Date(client.createdAt).toLocaleDateString(LOCALE_MAP[lang]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
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
            className="text-xs text-danger/80 transition-colors hover:text-danger disabled:opacity-50"
          >
            {deleting ? t("deleting") : t("delete_client_btn")}
          </button>
        )}
      </div>

      <ProfileHeader
        eyebrow={t("client_profile_eyebrow")}
        initials={initials.toUpperCase()}
        name={`${client.firstName} ${client.lastName}`}
        subtitle={client.email || client.phone}
        accent={activeCount > 0 ? "mint" : "faint"}
        statusLabel={activeCount > 0 ? t("rental_active") : t("rental_inactive")}
        meta={[
          { label: t("field_renter_phone"), value: client.phone },
          { label: t("since_label"), value: sinceDate },
        ]}
        clearance={{
          level: Math.min(activeCount, 3),
          max: 3,
          label: t("active_units_label"),
        }}
      />

      <form onSubmit={save} className="border-b border-line py-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_renter_first_name")}</label>
            <input
              required
              disabled={!editable}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_renter_last_name")}</label>
            <input
              required
              disabled={!editable}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_renter_phone")}</label>
            <input
              required
              type="tel"
              disabled={!editable}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_renter_email")}</label>
            <input
              type="email"
              disabled={!editable}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("renter_email_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-1.5 block label-eyebrow">{t("field_client_notes")}</label>
          <textarea
            disabled={!editable}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("client_notes_placeholder")}
            className={`${FIELD_CLASS} resize-none`}
          />
        </div>

        {error && <div className="mt-6 text-xs text-danger">{error}</div>}
        {saved && !error && <div className="mt-6 text-xs text-mint">{t("client_updated")}</div>}

        {editable && (
          <div className="mt-9 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t("saving") : t("save_changes")}
            </button>
          </div>
        )}
      </form>

      <div className="pt-10">
        <div className="label-eyebrow mb-4">{t("client_vehicles_eyebrow")}</div>
        {client.vehicles.length === 0 ? (
          <div className="py-6 text-sm text-muted">{t("client_vehicles_empty")}</div>
        ) : (
          <div className="divide-y divide-line">
            {client.vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => router.push(`/vehicle/${v.id}`)}
                className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-panel2/40"
              >
                {v.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.imageUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-panel2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink">{v.name}</div>
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
