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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { assignee: true, creator: true },
  });
  if (!task) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const body = await req.json();
  const action = body.action as "complete" | "reopen" | "transfer" | "edit" | undefined;

  const isAssignee = task.assigneeId === session.user.id;
  const isCreator = task.creatorId === session.user.id;
  const editable = canEdit(session.user.role);

  // Отмечать выполненной/возвращать в работу может исполнитель задачи либо админ/менеджер
  if (action === "complete" || action === "reopen") {
    if (!isAssignee && !editable) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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
            note: body.note?.trim() || null,
            userName: session.user.name,
          },
        },
      },
      include: TASK_INCLUDE,
    });
    return NextResponse.json(updated);
  }

  // Передать задачу другому менеджеру может текущий исполнитель либо админ/менеджер
  if (action === "transfer") {
    if (!isAssignee && !editable) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }
    const toUserId = body.toUserId?.trim();
    if (!toUserId) {
      return NextResponse.json({ error: "Выберите нового исполнителя" }, { status: 400 });
    }
    if (toUserId === task.assigneeId) {
      return NextResponse.json({ error: "Задача уже на этом исполнителе" }, { status: 400 });
    }
    const nextAssignee = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!nextAssignee) {
      return NextResponse.json({ error: "Исполнитель не найден" }, { status: 400 });
    }
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        assigneeId: toUserId,
        status: "OPEN",
        completedAt: null,
        history: {
          create: {
            action: "transferred",
            fromUserName: task.assignee.name,
            toUserName: nextAssignee.name,
            note: body.note?.trim() || null,
            userName: session.user.name,
          },
        },
      },
      include: TASK_INCLUDE,
    });
    return NextResponse.json(updated);
  }

  // Редактирование текста задачи — автор либо админ/менеджер
  if (!editable && !isCreator) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { title, description, dueDate } = body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description?.trim() || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      ...data,
      history: { create: { action: "edited", userName: session.user.name } },
    },
    include: TASK_INCLUDE,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const editable = canEdit(session.user.role);
  const isCreator = task.creatorId === session.user.id;
  if (!editable && !isCreator) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
