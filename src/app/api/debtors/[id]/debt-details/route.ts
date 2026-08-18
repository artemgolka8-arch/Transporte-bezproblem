import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchDebtorDebtDetails } from "@/lib/ravapi";

// Отдаёт расшифровку задолженности конкретного должника (за что списано,
// какие суммы, по каким основаниям) — данные тянутся из ravapi.eu "вживую"
// при каждом открытии окна «Информация о долге», без сохранения в БД.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const debtor = await prisma.debtor.findUnique({ where: { id: params.id } });
  if (!debtor) return NextResponse.json({ error: "Должник не найден" }, { status: 404 });

  try {
    const items = await fetchDebtorDebtDetails(debtor.externalId);
    return NextResponse.json({
      debtorId: debtor.id,
      currentBalance: debtor.currentBalance,
      balanceWithDeposits: debtor.balanceWithDeposits,
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось получить расшифровку долга из ravapi.eu";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
