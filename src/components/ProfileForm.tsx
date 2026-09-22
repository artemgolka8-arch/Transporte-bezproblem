"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ROLE_LABEL_KEYS, Role } from "@/lib/roles";

type ProfileData = {
  id: string;
  email: string;
  name: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  position: string | null;
  city: string | null;
  telegramChatId: string | null;
  avatarUrl: string | null;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 МБ — проверка на клиенте до сжатия
const AVATAR_MAX_DIMENSION = 512; // сжимаем фото до этого размера перед отправкой на сервер

// Сжимает выбранное изображение до квадрата AVATAR_MAX_DIMENSION×AVATAR_MAX_DIMENSION
// и возвращает data URL (JPEG), чтобы не хранить в базе тяжёлые оригиналы.
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const size = AVATAR_MAX_DIMENSION;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas unavailable"));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("image load failed"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

const FIELD_CLASS =
  "w-full border-b border-line bg-transparent px-0 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-cyan";

export function ProfileForm({
  user,
  fleetCounts,
}: {
  user: ProfileData;
  fleetCounts?: { AVAILABLE: number; WORKSHOP: number; RENTED: number };
}) {
  const router = useRouter();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [position, setPosition] = useState(user.position || "");
  const [city, setCity] = useState(user.city || "");
  const [telegramChatId, setTelegramChatId] = useState(user.telegramChatId || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(t("photo_invalid_type"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("photo_too_large"));
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch {
      setError(t("photo_invalid_type"));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        position,
        city,
        telegramChatId,
        avatarUrl,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("save_failed"));
      return;
    }
    setSaved(true);
    window.dispatchEvent(new CustomEvent("profile:avatar-updated", { detail: avatarUrl }));
    router.refresh();
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name;
  const initials =
    (user.firstName?.[0] || user.name?.[0] || "?") + (user.lastName?.[0] || user.name?.[1] || "");

  const statCells = [
    { key: "AVAILABLE" as const, labelKey: "status_available" as const },
    { key: "WORKSHOP" as const, labelKey: "status_workshop" as const },
    { key: "RENTED" as const, labelKey: "status_rented" as const },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-10">
        <div className="label-eyebrow mb-1.5">{t("profile_eyebrow")}</div>
        <h1 className="font-display text-3xl font-semibold text-ink">{t("profile_title")}</h1>
        <p className="mt-1.5 text-sm text-muted">{t("profile_subtitle")}</p>
      </div>

      {/* Карточка профиля — единый, спокойный по цвету блок: имя, роль, контакты
          и (если есть) сводка по автопарку. Без ярких акцентов и «уровней доступа» —
          строгий, деловой вид вместо игровой стилистики. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink"
              title={t("change_photo")}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-white">
                  {initials.toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {t("change_photo")}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoSelected}
              className="hidden"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-display text-lg font-semibold text-ink">
                  {displayName}
                </h2>
                <span className="inline-flex shrink-0 items-center rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t(ROLE_LABEL_KEYS[user.role])}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-cyan hover:underline"
                >
                  {t("change_photo")}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="text-muted hover:underline"
                  >
                    {t("remove_photo")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line/70 p-6 sm:grid-cols-4">
          <div>
            <div className="label-eyebrow mb-1">{t("field_position")}</div>
            <div className="truncate text-sm text-ink">{position || "—"}</div>
          </div>
          <div>
            <div className="label-eyebrow mb-1">{t("field_city")}</div>
            <div className="truncate text-sm text-ink">{city || "—"}</div>
          </div>
          {fleetCounts &&
            statCells.map((s) => (
              <div key={s.key}>
                <div className="label-eyebrow mb-1">{t(s.labelKey)}</div>
                <div className="text-sm font-semibold text-ink">{fleetCounts[s.key]}</div>
              </div>
            ))}
        </div>
      </div>

      <form onSubmit={submit} className="pt-10">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_first_name")}</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("first_name_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_last_name")}</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("last_name_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_phone")}</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phone_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_email")}</label>
            <input value={user.email} disabled className={`${FIELD_CLASS} opacity-50`} />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_position")}</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder={t("position_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1.5 block label-eyebrow">{t("field_city")}</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("city_placeholder")}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="mt-9 rounded-xl border border-line/70 p-5">
          <label className="mb-1.5 block label-eyebrow">{t("field_telegram_chat_id")}</label>
          <input
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder={t("telegram_chat_id_placeholder")}
            className={FIELD_CLASS}
          />
        </div>

        {error && <div className="mt-6 text-xs text-danger">{error}</div>}
        {saved && !error && <div className="mt-6 text-xs text-mint">{t("profile_updated")}</div>}

        <div className="mt-9 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("saving") : t("save_changes")}
          </button>
        </div>
      </form>
    </div>
  );
}
