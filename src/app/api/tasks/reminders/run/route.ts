import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

// Вызывается внешним планировщиком (Railway Cron Job, cron-job.org и т.п.)
// раз в минуту. Находит задачи, для которых пора напомнить, и шлёт Telegram
// исполнителю. Защищено секретом — без него никто чужой не сможет дёрнуть рассылку.
function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-cron-secret");
  const query = req.nextUrl.searchParams.get("secret");
  return header === secret || query === secret;
}

async function runReminders() {
  const due = await prisma.task.findMany({
    where: {
      status: "OPEN",
      reminderAt: { lte: new Date() },
      reminderSentAt: null,
    },
    include: { assignee: true },
  });

  const results: { taskId: string; ok: boolean; error?: string }[] = [];

  for (const task of due) {
    try {
      if (task.assignee.telegramChatId) {
        const lines = [`🔔 <b>Напоминание о задаче</b>`, task.title];
        if (task.description) lines.push(task.description);
        await sendTelegramMessage(task.assignee.telegramChatId, lines.join("\n\n"));
        await prisma.task.update({
          where: { id: task.id },
          data: {
            reminderSentAt: new Date(),
            history: {
              create: { action: "reminder_sent", userName: "Telegram" },
            },
          },
        });
      } else {
        // Telegram не подключён — отмечаем, чтобы не пытаться бесконечно
        await prisma.task.update({
          where: { id: task.id },
          data: {
            reminderSentAt: new Date(),
            history: {
              create: {
                action: "reminder_failed",
                note: "У исполнителя не подключён Telegram",
                userName: "Telegram",
              },
            },
          },
        });
      }
      results.push({ taskId: task.id, ok: true });
    } catch (e: any) {
      results.push({ taskId: task.id, ok: false, error: e?.message });
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  const results = await runReminders();
  return NextResponse.json({ checked: results.length, results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
