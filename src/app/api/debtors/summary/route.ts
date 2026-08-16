import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const negative = await prisma.debtor.findMany({
    where: { currentBalance: { lt: 0 } },
    select: { currentBalance: true },
  });
  const totalDebt = negative.reduce((sum, d) => sum + Math.abs(d.currentBalance), 0);
  const debtorCount = negative.length;

  const lastSnapshot = await prisma.debtorSyncSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    totalDebt,
    debtorCount,
    lastSync: lastSnapshot
      ? {
          prevTotalDebt: lastSnapshot.prevTotalDebt,
          newTotalDebt: lastSnapshot.newTotalDebt,
          prevDebtorCount: lastSnapshot.prevDebtorCount,
          newDebtorCount: lastSnapshot.newDebtorCount,
          createdAt: lastSnapshot.createdAt.toISOString(),
        }
      : null,
  });
}
