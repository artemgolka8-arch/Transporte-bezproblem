import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";
import { fetchAllDebtors } from "@/lib/ravapi";
import { sendTelegramMessage } from "@/lib/telegram";

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Порог "крупного" долга для уведомления в Telegram при появлении нового должника.
// Настраивается через DEBTOR_LARGE_ALERT_THRESHOLD (в zł), по умолчанию 500.
function largeDebtThreshold() {
  const raw = process.env.DEBTOR_LARGE_ALERT_THRESHOLD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} zł`;
}

// Считает суммарный долг (положительным числом) и количество должников
// (currentBalance < 0 — реальная задолженность, а не депозит/переплата).
async function computeTotals() {
  const negative = await prisma.debtor.findMany({
    where: { currentBalance: { lt: 0 } },
    select: { currentBalance: true },
  });
  const totalDebt = negative.reduce((sum, d) => sum + Math.abs(d.currentBalance), 0);
  return { totalDebt, debtorCount: negative.length };
}

async function notifyManagersAboutNewDebtors(
  newDebtors: { firstName: string; lastName: string; currentBalance: number }[]
) {
  if (newDebtors.length === 0) return;

  const managers = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MANAGER"] },
      telegramChatId: { not: null },
    },
    select: { telegramChatId: true },
  });

  if (managers.length === 0) return;

  const lines = [
    `⚠️ <b>Новый крупный должник${newDebtors.length > 1 ? "и" : ""}</b>`,
    ...newDebtors.map(
      (d) => `${d.firstName} ${d.lastName} — ${formatMoney(Math.abs(d.currentBalance))}`
    ),
  ];
  const text = lines.join("\n");

  for (const m of managers) {
    if (!m.telegramChatId) continue;
    try {
      await sendTelegramMessage(m.telegramChatId, text);
    } catch {
      // Не даём сбою Telegram сорвать саму синхронизацию должников.
    }
  }
}

// Тянет актуальный список должников из ravapi.eu и обновляет локальную таблицу:
// существующие (по externalId) обновляются, новые создаются. Ничего не удаляем —
// если клиент погасил долг и пропал из выдачи ravapi, запись остаётся как история,
// её можно будет позже скрывать по currentBalance >= 0.
//
// Заодно: 1) сохраняет снапшот "было -> стало" для карточки "Итого",
// 2) шлёт менеджерам в Telegram уведомление о новых должниках с крупной суммой.
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

  const { totalDebt: prevTotalDebt, debtorCount: prevDebtorCount } = await computeTotals();

  const threshold = largeDebtThreshold();
  const newLargeDebtors: { firstName: string; lastName: string; currentBalance: number }[] = [];

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
      if (data.currentBalance < 0 && Math.abs(data.currentBalance) > threshold) {
        newLargeDebtors.push({
          firstName: data.firstName,
          lastName: data.lastName,
          currentBalance: data.currentBalance,
        });
      }
    }
  }

  const { totalDebt: newTotalDebt, debtorCount: newDebtorCount } = await computeTotals();

  await prisma.debtorSyncSnapshot.create({
    data: { prevTotalDebt, newTotalDebt, prevDebtorCount, newDebtorCount },
  });

  await notifyManagersAboutNewDebtors(newLargeDebtors);

  return NextResponse.json({
    created,
    updated,
    total: remote.length,
    newLargeDebtors: newLargeDebtors.length,
  });
}
