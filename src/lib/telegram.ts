// Telegram Bot API — https://core.telegram.org/bots/api#sendmessage
// Бота создаёте один раз через @BotFather, токен кладёте в TELEGRAM_BOT_TOKEN.
// Чтобы бот мог написать конкретному человеку, тот должен сначала сам
// написать боту (нажать Start) — так устроен Telegram, это не обойти.
export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не настроен");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data?.description || `Ошибка Telegram API (HTTP ${res.status})`;
    throw new Error(msg);
  }
}
