"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { canEdit } from "@/lib/roles";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type ClientVehicle = { id: string; code: string; name: string };

type ClientRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  vehicles: ClientVehicle[];
};

export function ClientsList({
  clients,
  role,
}: {
  clients: ClientRow[];
  role: "ADMIN" | "MANAGER" | "VIEWER";
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const editable = canEdit(role);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = `${c.firstName} ${c.lastName} ${c.phone} ${c.email || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-eyebrow mb-1">{t("clients_eyebrow")}</div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t("clients_title")}</h1>
        </div>
        {editable && (
          <button
            onClick={() => setFormOpen(true)}
            className="rounded-lg border border-cyan/40 bg-cyanDim/40 px-4 py-2.5 text-sm font-medium text-cyan shadow-glowCyan transition-opacity hover:opacity-90"
          >
            {t("new_client_btn")}
          </button>
        )}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("clients_search_placeholder")}
        className="mb-5 w-full rounded-lg border border-line bg-bg2 px-3 py-2.5 text-sm text-ink outline-none focus:border-cyan/50"
      />

      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-1 py-14 text-center">
          <div className="text-sm text-ink">{t("clients_empty_title")}</div>
          <div className="text-xs text-muted">{t("clients_empty_subtitle")}</div>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_name")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_phone")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_email")}</th>
                <th className="px-5 py-3 font-normal label-eyebrow">{t("col_client_vehicle")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-panel2/60"
                >
                  <td className="px-5 py-3 text-ink">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{c.phone}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{c.email || "—"}</td>
                  <td className="px-5 py-3">
                    {c.vehicles.length === 0 ? (
                      <span className="text-xs text-faint">{t("clients_not_renting")}</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {c.vehicles.map((v) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <NewClientModal
          onClose={() => setFormOpen(false)}
          onCreated={(client) => {
            setFormOpen(false);
            router.push(`/clients/${client.id}`);
          }}
        />
      )}
    </div>
  );
}

function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: { id: string }) => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("create_failed"));
      return;
    }
    const client = await res.json();
    onCreated(client);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8">
      <form onSubmit={submit} className="panel w-full max-w-sm p-6 animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">{t("new_client_title")}</h2>
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

        <label className="mb-1 block label-eyebrow">{t("field_renter_email")}</label>
        <input
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
          disabled={loading}
          className="w-full rounded-lg border border-cyan/40 bg-cyanDim/40 py-2.5 text-sm font-medium text-cyan transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("creating") : t("create")}
        </button>
      </form>
    </div>
  );
}
