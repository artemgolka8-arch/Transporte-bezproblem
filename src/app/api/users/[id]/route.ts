import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USER_SELECT = {
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const body = await req.json();
  const { role, name, email, firstName, lastName, phone, position, city } = body;

  try {
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email: String(email).toLowerCase().trim() } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(city !== undefined ? { city } : {}),
      },
      select: USER_SELECT,
    });
    return NextResponse.json(user);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Пользователь с такой почтой уже есть" }, { status: 409 });
    }
    return NextResponse.json({ error: "Ошибка при сохранении" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  if (session.user.id === params.id) {
    return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
