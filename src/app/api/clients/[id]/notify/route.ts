import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { sendEmail, sendSms } from "@/lib/notify";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const messages = await prisma.clientMessage.findMany({
    where: { clientId: params.id },
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
  const channel = body.channel as "EMAIL" | "SMS";
  const message = (body.message as string | undefined)?.trim();
  const subject = (body.subject as string | undefined)?.trim() || "BezProblem";
  const sender = body.sender as string | undefined;

  if ((channel !== "EMAIL" && channel !== "SMS") || !message) {
    return NextResponse.json({ error: "Заполните текст сообщения" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const target = channel === "EMAIL" ? client.email : client.phone;
  if (!target) {
    return NextResponse.json(
      { error: channel === "EMAIL" ? "У клиента не указана почта" : "У клиента не указан телефон" },
      { status: 400 }
    );
  }

  try {
    if (channel === "EMAIL") {
      await sendEmail(target, subject, message);
    } else {
      await sendSms(target, message, sender);
    }

    const record = await prisma.clientMessage.create({
      data: {
        clientId: client.id,
        channel,
        target,
        body: message,
        status: "SENT",
        sentBy: session.user.name || session.user.email || null,
      },
    });
    return NextResponse.json(record);
  } catch (err: any) {
    const errorMessage = err?.message ? String(err.message) : "Не удалось отправить";
    await prisma.clientMessage.create({
      data: {
        clientId: client.id,
        channel,
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
