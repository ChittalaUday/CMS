import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const SALT_ROUNDS = 12

const users = [
  {
    email: "superadmin@cms.local",
    username: "superadmin",
    name: "Super Admin",
    password: "SuperAdmin@123",
    role: "SUPER_ADMIN" as const,
  },
  {
    email: "admin@cms.local",
    username: "admin",
    name: "Admin User",
    password: "Admin@123",
    role: "ADMIN" as const,
  },
  {
    email: "editor@cms.local",
    username: "editor",
    name: "Editor User",
    password: "Editor@123",
    role: "EDITOR" as const,
  },
]

async function main() {
  console.log("Seeding database…")

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, SALT_ROUNDS)

    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: { password: hashed, name: user.name, role: user.role },
      create: {
        email: user.email,
        username: user.username,
        name: user.name,
        password: hashed,
        role: user.role,
      },
    })

    console.log(`  ✓ ${created.role.padEnd(12)} ${created.email}`)
  }

  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
