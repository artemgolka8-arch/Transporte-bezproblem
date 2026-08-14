import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  position: true,
  city: true,
  createdAt: true,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: PROFILE_SELECT,
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const body = await req.json();
  const { name, firstName, lastName, phone, position, city } = body;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(position !== undefined ? { position } : {}),
      ...(city !== undefined ? { city } : {}),
    },
    select: PROFILE_SELECT,
  });
  return NextResponse.json(user);
}
