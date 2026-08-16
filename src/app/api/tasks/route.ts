import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

const TASK_INCLUDE = {
  creator: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  history: { orderBy: { createdAt: "desc" as const } },
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Задачу видит только тот, кто с ней когда-либо связан: создатель,
  // текущий исполнитель, либо участник цепочки передач.
  const tasks = await prisma.task.findMany({
    where: { participants: { some: { id: session.user.id } } },
    include: TASK_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, assigneeId, dueDate, reminderAt } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
  }

  const finalAssigneeId = assigneeId?.trim() || session.user.id;
  const assignee = await prisma.user.findUnique({ where: { id: finalAssigneeId } });
  if (!assignee) {
    return NextResponse.json({ error: "Исполнитель не найден" }, { status: 400 });
  }

  // Участники — создатель и исполнитель (если это один и тот же человек, задачу видит только он)
  const participantIds = Array.from(new Set([session.user.id, finalAssigneeId]));

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
      creatorId: session.user.id,
      assigneeId: finalAssigneeId,
      participants: { connect: participantIds.map((id) => ({ id })) },
      history: {
        create: {
          action: "created",
          toUserName: assignee.name,
          userName: session.user.name,
        },
      },
    },
    include: TASK_INCLUDE,
  });

  return NextResponse.json(task, { status: 201 });
}
