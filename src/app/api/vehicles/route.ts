import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    include: { keys: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vehicles);
}

const BRAND_NAMES: Record<string, string> = {
  DUOTTS: "Duotts",
  LOOK_ROAD: "Look Road",
  ONE_SPORT: "One Sport",
  FUNBIKE: "FunBike",
  INDIANA: "Indiana",
  NILOX: "Nilox",
  RAVAPI: "BezProblem x Ravapi",
  HONDA_VISION_110: "Honda Vision 110 2025",
  HONDA_PCX_125: "Honda PCX 125 2025",
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  if (!canEdit(session.user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await req.json();
  const { code, vin, type, location, brand, color, city, imageUrl } = body;

  if (!code || !type) {
    return NextResponse.json({ error: "Заполните регистрационный номер и тип" }, { status: 400 });
  }

  const name = brand && BRAND_NAMES[brand] ? `${BRAND_NAMES[brand]} ${code}` : code;

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        code,
        vin: vin || null,
        name,
        type,
        brand: brand || null,
        color: color || null,
        city: city || null,
        imageUrl: imageUrl || null,
        location: location || null,
        history: {
          create: {
            status: "AVAILABLE",
            note: "Единица техники добавлена в систему",
            userName: session.user.name || session.user.email || "Неизвестно",
          },
        },
      },
      include: { keys: true },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Такой код уже используется" }, { status: 409 });
    }
    return NextResponse.json({ error: "Ошибка при создании" }, { status: 500 });
  }
}
