import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInitDataFromRequest, verifyTelegramInitData } from "@/lib/telegramAuth";

export async function GET(req: NextRequest) {
  const check = verifyTelegramInitData(getInitDataFromRequest(req));
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { telegramChatId: String(check.user.id) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phone: true,
      position: true,
      city: true,
    },
  });

  if (!user) {
    return NextResponse.json({ linked: false });
  }

  return NextResponse.json({ linked: true, profile: user });
}
