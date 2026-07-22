import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  console.log(`Connecting to database...`)
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    const clientSlug = "niruthi"
    const clientName = "Niruthi"

    console.log(`Finding or creating client: ${clientName} (${clientSlug})...`)
    const client = await prisma.client.upsert({
      where: { slug: clientSlug },
      update: { name: clientName },
      create: {
        name: clientName,
        slug: clientSlug,
        status: "ACTIVE",
      },
    })
    console.log(`Client found/created: ID = ${client.id}`)

    const adminUsers = [
      {
        email: "shiva.in@niruthi.com",
        username: "shiva.in",
        name: "Shiva",
      },
    ]

    const adminPassword = process.env.NIRUTHI_ADMIN_PASSWORD || "Niruthi@123"

    console.log(`Hashing password...`)
    const SALT_ROUNDS = 12
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS)

    for (const adminUser of adminUsers) {
      console.log(`Creating/updating admin user: ${adminUser.email}...`)
      const user = await prisma.user.upsert({
        where: { email: adminUser.email },
        update: {
          username: adminUser.username,
          name: adminUser.name,
          password: hashedPassword,
          role: "ADMIN",
          clientId: client.id,
        },
        create: {
          email: adminUser.email,
          username: adminUser.username,
          name: adminUser.name,
          password: hashedPassword,
          role: "ADMIN",
          clientId: client.id,
        },
      })

      console.log(`Admin user seeded successfully!`)
      console.log(`Email: ${user.email}`)
      console.log(`Username: ${user.username}`)
      console.log(`Password: ${process.env.NIRUTHI_ADMIN_PASSWORD ? "[REDACTED]" : adminPassword}`)
      console.log(`Client: ${clientName} (ID: ${client.id})`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error("Seeding failed:")
  console.error(e)
  process.exit(1)
})
