import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@fleet.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const adminName = process.env.SEED_ADMIN_NAME || "Администратор";

  const hashed = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashed,
      name: adminName,
      role: "ADMIN",
    },
  });

  console.log(`Готово: администратор ${admin.email}`);

  const existing = await prisma.vehicle.count();
  if (existing === 0) {
    const samples = [
      {
        code: "BK-001",
        name: "Городской велосипед №1",
        type: "BIKE" as const,
        status: "AVAILABLE" as const,
        location: "Склад А",
        keys: [
          { label: "Ключ от батареи A" },
          { label: "Ключ от батареи A", isDuplicate: true },
          { label: "Ключ от замка" },
        ],
      },
      {
        code: "BK-002",
        name: "Городской велосипед №2",
        type: "BIKE" as const,
        status: "WORKSHOP" as const,
        problemDescription: "Спущено переднее колесо, требуется замена камеры.",
        location: "Мастерская",
        keys: [
          { label: "Ключ от батареи A" },
          { label: "Ключ от батареи B" },
          { label: "Ключ от батареи B", isDuplicate: true },
          { label: "Ключ от замка" },
          { label: "Ключ от замка", isDuplicate: true },
        ],
      },
      {
        code: "SC-014",
        name: "Электросамокат №14",
        type: "SCOOTER" as const,
        status: "RENTED" as const,
        renter: "Иван Петров",
        location: "В городе",
        keys: [{ label: "Ключ от батареи" }, { label: "Ключ от замка" }],
      },
    ];

    for (const s of samples) {
      const { keys, ...vehicleData } = s;
      await prisma.vehicle.create({
        data: {
          ...vehicleData,
          keys: { create: keys },
          history: {
            create: {
              status: vehicleData.status,
              note: "Начальное состояние (демо-данные)",
              userName: "Система",
            },
          },
        },
      });
    }
    console.log("Добавлены демонстрационные единицы техники.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
