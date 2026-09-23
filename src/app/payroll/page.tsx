import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayrollRows } from "@/lib/payrollServer";
import { AMBASSADOR_HOME, canAccessPayroll, isViewRestrictedRole, TEAM_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/AppShell";
import { PayrollList } from "@/components/PayrollList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Зарплаты и бонусы",
};

export default async function PayrollPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Раздел только для директора и администратора
  if (!canAccessPayroll(session.user.role)) {
    redirect(isViewRestrictedRole(session.user.role) ? AMBASSADOR_HOME : "/");
  }

  const [rows, recipients] = await Promise.all([
    getPayrollRows(),
    prisma.user.findMany({
      where: { role: { in: TEAM_ROLES } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
      <PayrollList rows={rows} recipients={recipients} />
    </AppShell>
  );
}
