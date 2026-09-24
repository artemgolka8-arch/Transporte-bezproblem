import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAmbassador, isViewRestrictedRole } from "@/lib/roles";
import { toReportRow } from "@/lib/reports";
import { toPlanRow } from "@/lib/plans";
import { AppShell } from "@/components/AppShell";
import { ReportsList } from "@/components/ReportsList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отчёты",
};

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ambassadorOnly = isAmbassador(session.user.role);

  // Амбассадор видит только свои отчёты; остальные роли — все отчёты всех амбассадоров
  const reports = await prisma.report.findMany({
    where: ambassadorOnly ? { authorId: session.user.id } : undefined,
    orderBy: { date: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  const rows = reports.map(toReportRow);

  // Планы на день (вкладка «Планы»): амбассадор видит только свои, остальные — все
  const plans = await prisma.plan.findMany({
    where: ambassadorOnly ? { authorId: session.user.id } : undefined,
    orderBy: [{ planDate: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true } } },
  });
  const planRows = plans.map(toPlanRow);

  // Амбассадору, директору и PR-менеджеру статистику автопарка не показываем
  // (и не отдаём в браузер)
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
      <ReportsList
        reports={rows}
        plans={planRows}
        role={session.user.role}
        currentUserId={session.user.id}
      />
    </AppShell>
  );
}
