import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ClientProfile } from "@/components/ClientProfile";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      vehicles: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, code: true, name: true, status: true, imageUrl: true, rentedUntil: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!client) notFound();

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
      <ClientProfile
        client={{
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email,
          notes: client.notes,
          createdAt: client.createdAt.toISOString(),
          vehicles: client.vehicles.map((v) => ({
            id: v.id,
            code: v.code,
            name: v.name,
            status: v.status,
            imageUrl: v.imageUrl,
            rentedUntil: v.rentedUntil ? v.rentedUntil.toISOString() : null,
          })),
          messages: client.messages.map((m) => ({
            id: m.id,
            channel: m.channel as "EMAIL" | "SMS",
            target: m.target,
            body: m.body,
            status: m.status as "SENT" | "FAILED",
            error: m.error,
            sentBy: m.sentBy,
            createdAt: m.createdAt.toISOString(),
          })),
        }}
        role={session.user.role}
      />
    </AppShell>
  );
}
