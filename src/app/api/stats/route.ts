import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    select: { type: true, status: true, brand: true, city: true },
  });

  const byStatus = { AVAILABLE: 0, WORKSHOP: 0, RENTED: 0 };
  const byType: Record<
    "BIKE" | "SCOOTER",
    { total: number; AVAILABLE: number; WORKSHOP: number; RENTED: number }
  > = {
    BIKE: { total: 0, AVAILABLE: 0, WORKSHOP: 0, RENTED: 0 },
    SCOOTER: { total: 0, AVAILABLE: 0, WORKSHOP: 0, RENTED: 0 },
  };
  const cityMap = new Map<
    string,
    { total: number; AVAILABLE: number; WORKSHOP: number; RENTED: number }
  >();
  const brandMap = new Map<string, number>();

  for (const v of vehicles) {
    byStatus[v.status]++;
    byType[v.type].total++;
    byType[v.type][v.status]++;

    const cityKey = v.city?.trim() || "—";
    if (!cityMap.has(cityKey)) {
      cityMap.set(cityKey, { total: 0, AVAILABLE: 0, WORKSHOP: 0, RENTED: 0 });
    }
    const cityEntry = cityMap.get(cityKey)!;
    cityEntry.total++;
    cityEntry[v.status]++;

    if (v.brand) {
      brandMap.set(v.brand, (brandMap.get(v.brand) || 0) + 1);
    }
  }

  const byCity = Array.from(cityMap.entries())
    .map(([city, counts]) => ({ city, ...counts }))
    .sort((a, b) => b.total - a.total);

  const byBrand = Array.from(brandMap.entries())
    .map(([brand, total]) => ({ brand, total }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    total: vehicles.length,
    byStatus,
    byType,
    byCity,
    byBrand,
  });
}
