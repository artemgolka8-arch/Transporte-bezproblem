import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { TasksBoard } from "@/components/TasksBoard";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tasks = await prisma.task.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      history: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
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
      <TasksBoard
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        users={users}
        role={session.user.role}
        currentUserId={session.user.id}
      />
    </>
  );
}
