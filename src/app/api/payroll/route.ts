import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessPayroll, TEAM_ROLES } from "@/lib/roles";
import { parsePayrollInput } from "@/lib/payroll";
import { attachRecipients, getPayrollRows } from "@/lib/payrollServer";

// «Зарплаты и бонусы» — только ADMIN и DIRECTOR.
async function requireAccess() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  if (!canAccessPayroll(session.user.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const access = await requireAccess();
  if (access.error) return access.error;
  return NextResponse.json(await getPayrollRows());
}

export async function POST(req: NextRequest) {
  const access = await requireAccess();
  if (access.error) return access.error;

  const body = await req.json().catch(() => ({}));
  const parsed = parsePayrollInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { recipientId, manualName, ...data } = parsed.data;

  // Получатель из списка — берём его имя из базы (а не из запроса)
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

  const entry = await prisma.payrollEntry.create({
    data: {
      ...data,
      recipientId: linkedId,
      recipientName,
      createdByName: access.session!.user.name || access.session!.user.email || null,
    },
  });
  const [row] = await attachRecipients([entry]);
  return NextResponse.json(row, { status: 201 });
}
