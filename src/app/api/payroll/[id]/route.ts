import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPayroll, TEAM_ROLES } from "@/lib/roles";
import { parsePayrollInput } from "@/lib/payroll";
import { attachRecipients } from "@/lib/payrollServer";

async function requireAccess() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  if (!canAccessPayroll(session.user.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess();
  if (access.error) return access.error;

  const existing = await prisma.payrollEntry.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Выплата не найдена" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parsePayrollInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { recipientId, manualName, ...data } = parsed.data;

  let recipientName = manualName || "";
  let linkedId: string | null = null;
  if (recipientId) {
    const user = await prisma.user.findFirst({
      where: { id: recipientId, role: { in: TEAM_ROLES } },
      select: { id: true, name: true },
    });
    if (!user) return NextResponse.json({ error: "Получатель не найден" }, { status: 404 });
    recipientName = user.name;
    linkedId = user.id;
  }

  const entry = await prisma.payrollEntry.update({
    where: { id: params.id },
    data: { ...data, recipientId: linkedId, recipientName },
  });
  const [row] = await attachRecipients([entry]);
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess();
  if (access.error) return access.error;

  try {
    await prisma.payrollEntry.delete({ where: { id: params.id } });
  } catch {
    return NextResponse.json({ error: "Выплата не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
