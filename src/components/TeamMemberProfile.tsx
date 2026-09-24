"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";

type Member = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: Role;
  phone: string | null;
  position: string | null;
  city: string | null;
  avatarV: string | null;
};

const FIELD_CLASS =
  "w-full border-b border-line bg-transparent px-0 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-cyan";

// Профиль другого сотрудника — только просмотр. Единственное, что можно
// изменить, — должность, и то только директору и администратору.
export function TeamMemberProfile({
  member,
  canEditPosition,
}: {
  member: Member;
  canEditPosition: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [position, setPosition] = useState(member.position || "");
  const [savedPosition, setSavedPosition] = useState(member.position || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const displayName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.name;
  const initials = (
    (member.firstName?.[0] || member.name?.[0] || "?") + (member.lastName?.[0] || member.name?.[1] || "")
  ).toUpperCase();

  async function savePosition(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/team/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("save_failed"));
      return;
    }
    const data = await res.json();
    setPosition(data.position || "");
    setSavedPosition(data.position || "");
    setSaved(true);
    router.refresh();
  }

  const readOnlyValue = (value?: string | null) => (
    <div className="truncate border-b border-line/60 py-2.5 text-sm text-ink">{value || "—"}</div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link
        href="/team"
        className="mb-6 inline-block text-sm text-muted transition-colors hover:text-cyan"
      >
        {t("team_back_btn")}
      </Link>

      <div className="mb-8">
        <div className="label-eyebrow mb-1.5">{t("team_profile_eyebrow")}</div>
        <h1 className="font-display text-3xl font-semibold text-ink">{displayName}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("team_view_only_hint")}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-panelLg">
        <div className="h-20 bg-cyanDim sm:h-24" />

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
            <div className="-mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-panel bg-ink shadow-panelLg sm:-mt-16 sm:h-32 sm:w-32">
              {member.avatarV ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/team/${member.id}/avatar?v=${member.avatarV}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-brandGradient font-display text-3xl font-semibold text-white">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-1 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="truncate font-display text-2xl font-semibold text-ink">{displayName}</h2>
                <span className="inline-flex shrink-0 items-center rounded-full border border-cyan/30 bg-cyanDim/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-cyan">
                  {t(ROLE_LABEL_KEYS[member.role])}
                </span>
              </div>
              {savedPosition && <p className="mt-1 truncate text-sm text-muted">{savedPosition}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-panel p-6 shadow-card sm:p-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 label-eyebrow">{t("field_email")}</div>
            {member.email ? (
              <a
                href={`mailto:${member.email}`}
                className="block truncate border-b border-line/60 py-2.5 text-sm text-ink transition-colors hover:text-cyan"
              >
                {member.email}
              </a>
            ) : (
              readOnlyValue(null)
            )}
          </div>
          <div>
            <div className="mb-1.5 label-eyebrow">{t("field_phone")}</div>
            {member.phone ? (
              <a
                href={`tel:${member.phone.replace(/\s+/g, "")}`}
                className="block truncate border-b border-line/60 py-2.5 text-sm text-ink transition-colors hover:text-cyan"
              >
                {member.phone}
              </a>
            ) : (
              readOnlyValue(null)
            )}
          </div>
          <div>
            <div className="mb-1.5 label-eyebrow">{t("field_city")}</div>
            {readOnlyValue(member.city)}
          </div>
          <div>
            <div className="mb-1.5 label-eyebrow">{t("field_position")}</div>
            {canEditPosition ? (
              <form onSubmit={savePosition} className="flex items-end gap-3">
                <input
                  value={position}
                  onChange={(e) => {
                    setPosition(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={t("position_placeholder")}
                  maxLength={100}
                  className={FIELD_CLASS}
                />
                <button
                  type="submit"
                  disabled={saving || position.trim() === savedPosition}
                  className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? t("saving") : t("save_changes")}
                </button>
              </form>
            ) : (
              readOnlyValue(savedPosition)
            )}
            {error && <div className="mt-2 text-xs text-danger">{error}</div>}
            {saved && !error && <div className="mt-2 text-xs text-mint">{t("position_updated")}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
