import crypto from "crypto";

// Проверка initData, которую Telegram Mini App передаёт на каждый запрос.
// Алгоритм из официальной доки:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

const MAX_AGE_SECONDS = 24 * 60 * 60; // 24 часа — initData считается свежей

export function verifyTelegramInitData(
  initData: string
): { ok: true; user: TelegramWebAppUser } | { ok: false; error: string } {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN не настроен на сервере" };
  if (!initData) return { ok: false, error: "Пустые данные от Telegram" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "Нет подписи в данных Telegram" };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) {
    return { ok: false, error: "Подпись Telegram не совпадает" };
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (authDate && Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    return { ok: false, error: "Данные Telegram устарели, откройте приложение заново" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "Нет данных пользователя" };

  try {
    const user = JSON.parse(userRaw) as TelegramWebAppUser;
    return { ok: true, user };
  } catch {
    return { ok: false, error: "Не удалось разобрать данные пользователя" };
  }
}

export function getInitDataFromRequest(req: Request): string {
  return req.headers.get("x-telegram-init-data") || "";
}
