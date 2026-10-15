import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [adminRole, normalRole, customerRole, basicMembership] =
  await Promise.all([
    prisma.role.upsert({
      where: { rolename: "admin" },
      update: {},
      create: { rolename: "admin" },
    }),
    prisma.role.upsert({
      where: { rolename: "normal" },
      update: {},
      create: { rolename: "normal" },
    }),
    prisma.role.upsert({
      where: { rolename: "customer" },
      update: {},
      create: { rolename: "customer" },
    }),
    prisma.membership.upsert({
      where: { mname: "basic" },
      update: { score: 10 },
      create: { mname: "basic", score: 10 },
    }),
  ]);

  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: ADMIN_USERNAME },
    });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          username: ADMIN_USERNAME,
          password: await bcrypt.hash(ADMIN_PASSWORD, 12),
          roleid: adminRole.roleid,
          mid: basicMembership.mid,
        },
      });
      console.info("Initial admin account created.");
    } else if (existingAdmin.roleid !== adminRole.roleid) {
      console.warn("Configured admin username already exists but is not an admin.");
    }
  } else if (ADMIN_USERNAME || ADMIN_PASSWORD) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set together.");
  }

  console.info(`Seeded roles (${adminRole.rolename}, ${customerRole.rolename}) and basic membership.`);
}

main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
