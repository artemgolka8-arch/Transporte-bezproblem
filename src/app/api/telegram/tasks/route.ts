import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTelegramUser } from "@/lib/telegramSession";

const TASK_INCLUDE = {
  creator: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
};

export async function GET(req: NextRequest) {
  const { user, error, status } = await resolveTelegramUser(req);
  if (!user) return NextResponse.json({ error }, { status });

  const tasks = await prisma.task.findMany({
    where: { participants: { some: { id: user.id } } },
    include: TASK_INCLUDE,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(tasks);
}
