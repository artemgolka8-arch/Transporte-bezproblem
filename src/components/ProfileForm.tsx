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

function CameraIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 20;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.6l1-1.6A1.5 1.5 0 0 1 10.4 4.6h3.2a1.5 1.5 0 0 1 1.3.8l1 1.6h2.6A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

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

      {/* Карточка профиля — «шапка» с крупным аватаром поверх лёгкого градиентного
          баннера, как в премиальных профилях, а не плоский ряд из мелких полей. */}
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-panelLg">
        <div className="relative h-28 bg-brandGradient sm:h-32">
          <div className="absolute inset-0 bg-brandRadial opacity-60" />
        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-panel bg-ink shadow-panelLg transition-transform hover:scale-[1.02] sm:-mt-16 sm:h-32 sm:w-32"
              title={t("change_photo")}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-brandGradient font-display text-3xl font-semibold text-white">
                  {initials.toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <CameraIcon />
                <span className="text-[11px] font-medium">{t("change_photo")}</span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoSelected}
              className="hidden"
            />

            <div className="min-w-0 flex-1 pt-1 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="truncate font-display text-2xl font-semibold text-ink">
                  {displayName}
                </h2>
                <span className="inline-flex shrink-0 items-center rounded-full border border-cyan/30 bg-cyanDim/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-cyan">
                  {t(ROLE_LABEL_KEYS[user.role])}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg2 px-3 py-1.5 font-medium text-ink transition-colors hover:border-cyan/40 hover:text-cyan"
                >
                  <CameraIcon small />
                  {t("change_photo")}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="font-medium text-muted transition-colors hover:text-danger"
                  >
                    {t("remove_photo")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line/70 p-6 sm:grid-cols-4 sm:p-8">
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
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-card sm:p-8">
          <div className="label-eyebrow mb-6">{t("profile_form_section_title")}</div>
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
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-panel p-6 shadow-card sm:p-8">
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
