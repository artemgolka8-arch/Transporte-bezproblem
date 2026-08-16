import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTelegramUser } from "@/lib/telegramSession";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error, status } = await resolveTelegramUser(req);
  if (!user) return NextResponse.json({ error }, { status });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { participants: { select: { id: true } } },
  });
  if (!task) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const isParticipant = task.participants.some((p) => p.id === user.id);
  if (!isParticipant) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const isAssignee = task.assigneeId === user.id;
  const isCreator = task.creatorId === user.id;
  if (!isAssignee && !isCreator) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as "complete" | "reopen" | undefined;
  if (action !== "complete" && action !== "reopen") {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  const done = action === "complete";
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: done ? "DONE" : "OPEN",
      completedAt: done ? new Date() : null,
      history: {
        create: {
          action: done ? "completed" : "reopened",
          userName: `${user.name} (Telegram)`,
        },
      },
    },
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
