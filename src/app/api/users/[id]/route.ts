import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
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
  const { role, name, email, firstName, lastName, phone, position, city, password } = body;

  // Смена пароля администратором: пароль хранится только в виде bcrypt-хеша
  let hashedPassword: string | undefined;
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не короче 8 символов" }, { status: 400 });
    }
    if (password.length > 72) {
      return NextResponse.json({ error: "Пароль слишком длинный (максимум 72 символа)" }, { status: 400 });
    }
    hashedPassword = await bcrypt.hash(password, 10);
  }

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
        ...(hashedPassword ? { password: hashedPassword } : {}),
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
  try {
    await prisma.user.delete({ where: { id: params.id } });
  } catch (e: any) {
    if (e?.code === "P2003") {
      return NextResponse.json(
        { error: "Нельзя удалить: на пользователе есть задачи. Сначала передайте или удалите их" },
        { status: 409 }
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
