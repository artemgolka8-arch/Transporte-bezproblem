import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { DebtorsList } from "@/components/DebtorsList";

export const dynamic = "force-dynamic";

export default async function DebtorsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const debtors = await prisma.debtor.findMany({
    orderBy: { currentBalance: "asc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  const negativeDebtors = debtors.filter((d) => d.currentBalance < 0);
  const totalDebt = negativeDebtors.reduce((sum, d) => sum + Math.abs(d.currentBalance), 0);
  const debtorCount = negativeDebtors.length;
  const lastSnapshot = await prisma.debtorSyncSnapshot.findFirst({ orderBy: { createdAt: "desc" } });
  const summary = {
    totalDebt,
    debtorCount,
    lastSync: lastSnapshot
      ? {
          prevTotalDebt: lastSnapshot.prevTotalDebt,
          newTotalDebt: lastSnapshot.newTotalDebt,
          prevDebtorCount: lastSnapshot.prevDebtorCount,
          newDebtorCount: lastSnapshot.newDebtorCount,
          createdAt: lastSnapshot.createdAt.toISOString(),
        }
      : null,
  };

  const vehicles = await prisma.vehicle.findMany({ select: { status: true } });
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
      <DebtorsList
        summary={summary}
        debtors={debtors.map((d) => ({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phoneNumber: d.phoneNumber,
          vehicleName: d.vehicleName,
          organisation: d.organisation,
          currentBalance: d.currentBalance,
          balanceWithDeposits: d.balanceWithDeposits,
          dateOfLastUnpaidPayoff: d.dateOfLastUnpaidPayoff
            ? d.dateOfLastUnpaidPayoff.toISOString()
            : null,
          debtNotes: d.debtNotes,
          isContactedForDebt: d.isContactedForDebt,
          lastSyncedAt: d.lastSyncedAt.toISOString(),
          messages: d.messages.map((m) => ({
            id: m.id,
            target: m.target,
            body: m.body,
            status: m.status,
            error: m.error,
            sentBy: m.sentBy,
            createdAt: m.createdAt.toISOString(),
          })),
        }))}
        role={session.user.role}
      />
    </AppShell>
  );
}
