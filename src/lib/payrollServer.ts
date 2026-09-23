// Серверные помощники для «Зарплат и бонусов» (работают с базой).
import type { PayrollEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toPayrollRow, type PayrollRow } from "@/lib/payroll";

// Все выплаты, новые сверху. Роль и фото получателей подтягиваем одним отдельным
// запросом по списку уникальных получателей — так не грузим тяжёлые фото на каждую строку.
export async function getPayrollRows(): Promise<PayrollRow[]> {
  const entries = await prisma.payrollEntry.findMany({
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });
  return attachRecipients(entries);
}

export async function attachRecipients(entries: PayrollEntry[]): Promise<PayrollRow[]> {
  const ids = Array.from(new Set(entries.map((e) => e.recipientId).filter((id): id is string => !!id)));
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, role: true, avatarUrl: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return entries.map((e) => toPayrollRow(e, e.recipientId ? byId.get(e.recipientId) : null));
}
