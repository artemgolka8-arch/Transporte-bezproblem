import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { fetchAllDebtors } from "@/lib/ravapi";

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Тянет актуальный список должников из ravapi.eu и обновляет локальную таблицу:
// существующие (по externalId) обновляются, новые создаются. Ничего не удаляем —
// если клиент погасил долг и пропал из выдачи ravapi, запись остаётся как история,
// её можно будет позже скрывать по currentBalance >= 0.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let remote;
  try {
    remote = await fetchAllDebtors();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось получить данные с ravapi.eu";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let created = 0;
  let updated = 0;

  for (const d of remote) {
    const data = {
      firstName: d.firstName ?? "",
      lastName: d.lastName ?? "",
      phoneNumber: d.phoneNumber ?? null,
      vehicleName: d.vehicleName ?? null,
      organisation: d.organisation ?? null,
      currentBalance: d.currentBalance ?? 0,
      balanceWithDeposits: d.balanceWithDeposits ?? null,
      dateOfFirstUnpaidPayoff: toDate(d.dateOfFirstUnpaidPayoff),
      dateOfLastUnpaidPayoff: toDate(d.dateOfLastUnpaidPayoff),
      debtNotes: d.debtNotes ?? null,
      isContactedForDebt: !!d.isContactedForDebt,
      lastSyncedAt: new Date(),
    };

    const existing = await prisma.debtor.findUnique({ where: { externalId: d.id } });
    if (existing) {
      await prisma.debtor.update({ where: { externalId: d.id }, data });
      updated++;
    } else {
      await prisma.debtor.create({ data: { externalId: d.id, ...data } });
      created++;
    }
  }

  return NextResponse.json({ created, updated, total: remote.length });
}
