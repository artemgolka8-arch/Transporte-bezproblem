import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    include: { assignee: true, creator: true, participants: { select: { id: true } } },
  });
  if (!task) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const isAssignee = task.assigneeId === session.user.id;
  const isCreator = task.creatorId === session.user.id;
  const isParticipant = task.participants.some((p) => p.id === session.user.id);

  // Задачу видит и может ей управлять только тот, кто с ней когда-либо связан
  // (создатель, текущий исполнитель, участник цепочки передач). Остальным — "не найдено".
  if (!isParticipant) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const body = await req.json();
  const action = body.action as "complete" | "reopen" | "not_done" | "transfer" | "edit" | undefined;
  const isAmbassador = session.user.role === "AMBASSADOR";

  // Отмечать выполненной/возвращать в работу может исполнитель либо автор задачи
  if (action === "complete" || action === "reopen") {
    if (!isAssignee && !isCreator) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }
    const done = action === "complete";
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: done ? "DONE" : "OPEN",
        completedAt: done ? new Date() : null,
        // Возврат в работу или повторное выполнение снимает прежнюю причину невыполнения
        notDoneReason: null,
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

  // Отметить невыполненной может исполнитель либо автор задачи; причина обязательна
  // (в первую очередь это действие для амбассадора: только просмотр + отметка
  // выполнено / не выполнено, с обязательным объяснением при "не выполнено")
  if (action === "not_done") {
    if (!isAssignee && !isCreator) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }
    const reason = body.note?.trim();
    if (!reason) {
      return NextResponse.json({ error: "Укажите причину невыполнения" }, { status: 400 });
    }
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "NOT_DONE",
        completedAt: null,
        notDoneReason: reason,
        history: {
          create: {
            action: "not_done",
            note: reason,
            userName: session.user.name,
          },
        },
      },
      include: TASK_INCLUDE,
    });
    return NextResponse.json(updated);
  }

  // Амбассадору доступны только просмотр задачи и отметка выполнено / не выполнено —
  // передавать другому исполнителю или редактировать текст задачи он не может
  if (isAmbassador) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  // Передать задачу другому менеджеру может текущий исполнитель либо автор задачи
  if (action === "transfer") {
    if (!isAssignee && !isCreator) {
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
        // Новый исполнитель становится (или остаётся) участником и получает доступ к задаче;
        // прежние участники доступ сохраняют
        participants: { connect: { id: toUserId } },
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

  // Редактирование текста задачи — автор либо текущий исполнитель
  if (!isCreator && !isAssignee) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { title, description, dueDate, reminderAt } = body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return NextResponse.json({ error: "Укажите название задачи" }, { status: 400 });
    data.title = title.trim();
  }
  if (description !== undefined) data.description = description?.trim() || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (reminderAt !== undefined) {
    data.reminderAt = reminderAt ? new Date(reminderAt) : null;
    data.reminderSentAt = null;
  }

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

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { participants: { select: { id: true } } },
  });
  if (!task) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const isParticipant = task.participants.some((p) => p.id === session.user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // Удалить задачу может только её автор (амбассадору удаление недоступно в принципе)
  const isCreator = task.creatorId === session.user.id;
  if (!isCreator || session.user.role === "AMBASSADOR") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
