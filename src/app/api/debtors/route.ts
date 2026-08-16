import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const debtors = await prisma.debtor.findMany({
    orderBy: { currentBalance: "asc" }, // самые крупные долги (отрицательный баланс) — сверху
  });

  return NextResponse.json(debtors);
}
