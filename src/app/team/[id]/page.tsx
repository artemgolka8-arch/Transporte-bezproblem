import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avatarVersion } from "@/lib/avatar";
import { canEditPosition, isViewRestrictedRole, TEAM_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/AppShell";
import { TeamMemberProfile } from "@/components/TeamMemberProfile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профиль сотрудника",
};

export default async function TeamMemberPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Свой профиль редактируется на обычной странице «Профиль»
  if (params.id === session.user.id) redirect("/profile");

  const member = await prisma.user.findFirst({
    where: { id: params.id, role: { in: TEAM_ROLES } },
    // Telegram Chat ID и прочие приватные поля в чужой профиль не отдаём
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      phone: true,
      position: true,
      city: true,
      avatarUrl: true,
    },
  });
  if (!member) notFound();

  const { avatarUrl, ...rest } = member;

  const vehicles = isViewRestrictedRole(session.user.role)
    ? []
    : await prisma.vehicle.findMany({ select: { status: true } });
  const counts = {
    AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: vehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: vehicles.filter((v) => v.status === "RENTED").length,
  };

  return (
    <AppShell
      counts={counts}
      userName={session.user.name || session.user.email || ""}
      role={session.user.role}
    >
      <TeamMemberProfile
        member={{ ...rest, avatarV: avatarUrl ? avatarVersion(avatarUrl) : null }}
        canEditPosition={canEditPosition(session.user.role)}
      />
    </AppShell>
  );
}
