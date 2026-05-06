import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SEED_USERS = [
  { username: "admin", password: "Admin1234", name: "Admin User", email: "admin@nhs.net", role: "admin", department: "Administration" },
  { username: "planner", password: "Planner1234", name: "Planner Lead", email: "planner@nhs.net", role: "planner", department: "Capacity Planning" },
  { username: "nurse1", password: "Nurse1234!", name: "Sarah Johnson", email: "s.johnson@nhs.net", role: "nurse", department: "Sexual Health" },
  { username: "doctor1", password: "Doctor1234!", name: "Dr. Michael Chen", email: "m.chen@nhs.net", role: "doctor", department: "Sexual Health" },
  { username: "clinician1", password: "Clinician1!", name: "Emma Wilson", email: "e.wilson@nhs.net", role: "clinician", department: "Sexual Health" },
];

async function main() {
  console.log("Seeding database...");
  for (const u of SEED_USERS) {
    const hashed = await bcrypt.hash(u.password, 12);
    await db.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, password: hashed },
    });
  }
  await db.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  console.log("Done. Demo credentials:");
  for (const u of SEED_USERS) console.log(`  ${u.username} / ${u.password}`);
}

main().catch(console.error).finally(() => db.$disconnect());
