import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { sendSms } from "@/lib/notify";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const messages = await prisma.debtorMessage.findMany({
    where: { debtorId: params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const message = (body.message as string | undefined)?.trim();
  const sender = body.sender as string | undefined;
  if (!message) {
    return NextResponse.json({ error: "Заполните текст сообщения" }, { status: 400 });
  }

  const debtor = await prisma.debtor.findUnique({ where: { id: params.id } });
  if (!debtor) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const target = debtor.phoneNumber;
  if (!target) {
    return NextResponse.json({ error: "У должника не указан телефон" }, { status: 400 });
  }

  try {
    await sendSms(target, message, sender);
    const record = await prisma.debtorMessage.create({
      data: {
        debtorId: debtor.id,
        target,
        body: message,
        status: "SENT",
        sentBy: session.user.name || session.user.email || null,
      },
    });
    if (!debtor.isContactedForDebt) {
      await prisma.debtor.update({ where: { id: debtor.id }, data: { isContactedForDebt: true } });
    }
    return NextResponse.json(record);
  } catch (err: any) {
    const errorMessage = err?.message ? String(err.message) : "Не удалось отправить";
    await prisma.debtorMessage.create({
      data: {
        debtorId: debtor.id,
        target,
        body: message,
        status: "FAILED",
        error: errorMessage,
        sentBy: session.user.name || session.user.email || null,
      },
    });
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
