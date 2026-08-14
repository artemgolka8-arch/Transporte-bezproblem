import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { UsersAdmin } from "@/components/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const vehicles = await prisma.vehicle.findMany({ select: { status: true } });
  const counts = {
    AVAILABLE: vehicles.filter((v) => v.status === "AVAILABLE").length,
    WORKSHOP: vehicles.filter((v) => v.status === "WORKSHOP").length,
    RENTED: vehicles.filter((v) => v.status === "RENTED").length,
  };

  return (
    <>
      <Navbar
        counts={counts}
        userName={session.user.name || session.user.email || ""}
        role={session.user.role}
      />
      <UsersAdmin
        users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) as any}
        currentUserId={session.user.id}
      />
    </>
  );
}
