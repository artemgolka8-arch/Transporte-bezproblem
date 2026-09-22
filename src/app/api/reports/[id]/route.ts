import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isAmbassador } from "@/lib/roles";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 });

  // Удалить может админ, либо сам автор отчёта (например, при ошибке)
  const isOwner = isAmbassador(session.user.role) && report.authorId === session.user.id;
  if (!isAdmin(session.user.role) && !isOwner) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  await prisma.report.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
