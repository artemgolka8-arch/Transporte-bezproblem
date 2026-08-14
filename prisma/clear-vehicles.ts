import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.vehicle.deleteMany({});
  console.log(`Удалено единиц техники: ${count} (ключи и история статусов удалены автоматически).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
