import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { sendSms } from "@/lib/notify";

// Массовая рассылка одного и того же сообщения нескольким должникам сразу.
// Плейсхолдеры {name} и {amount} в тексте подставляются индивидуально под каждого.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? (body.ids as string[]).filter((id) => typeof id === "string") : [];
  const template = typeof body.message === "string" ? body.message : "";

  if (ids.length === 0) {
    return NextResponse.json({ error: "Не выбраны должники" }, { status: 400 });
  }
  if (!template.trim()) {
    return NextResponse.json({ error: "Заполните текст сообщения" }, { status: 400 });
  }

  const debtors = await prisma.debtor.findMany({ where: { id: { in: ids } } });
  const sentBy = session.user.name || session.user.email || null;

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const debtor of debtors) {
    const target = debtor.phoneNumber;
    const message = template
      .replace(/\{name\}/g, debtor.firstName)
      .replace(/\{amount\}/g, `${Math.abs(debtor.currentBalance).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} zł`);

    if (!target) {
      results.push({ id: debtor.id, ok: false, error: "Нет телефона" });
      continue;
    }

    try {
      await sendSms(target, message);
      await prisma.debtorMessage.create({
        data: { debtorId: debtor.id, target, body: message, status: "SENT", sentBy },
      });
      if (!debtor.isContactedForDebt) {
        await prisma.debtor.update({ where: { id: debtor.id }, data: { isContactedForDebt: true } });
      }
      results.push({ id: debtor.id, ok: true });
    } catch (err: any) {
      const errorMessage = err?.message ? String(err.message) : "Не удалось отправить";
      await prisma.debtorMessage.create({
        data: { debtorId: debtor.id, target, body: message, status: "FAILED", error: errorMessage, sentBy },
      });
      results.push({ id: debtor.id, ok: false, error: errorMessage });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({ sent, failed: results.length - sent, results });
}
