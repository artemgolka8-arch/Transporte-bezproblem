import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, verifyTelegramInitData } from "@/lib/telegramAuth";

export async function resolveTelegramUser(req: Request) {
  const check = verifyTelegramInitData(getInitDataFromRequest(req));
  if (!check.ok) {
    return { error: check.error, status: 401 as const, user: null };
  }

  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(check.user.id) },
  });

  if (!user) {
    return { error: "Аккаунт не привязан к сайту", status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}
