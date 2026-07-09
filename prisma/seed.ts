import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"
import { API_REGISTRY } from "../src/lib/utils/api-registry"

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
    email: "admin@niruthi.com",
    username: "admin",
    name: "Admin User",
    password: "Niruthi@123",
    role: "ADMIN" as const,
  },
  {
    email: "editor@cms.local",
    username: "editor",
    name: "Editor User",
    password: "Editor@123",
    role: "EDITOR" as const,
  },
  {
    email: "developer@cms.local",
    username: "developer",
    name: "Developer User",
    password: "Developer@123",
    role: "DEVELOPER" as const,
  },
]

async function main() {
  console.log("Seeding database…")

  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, SALT_ROUNDS)

    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: { username: user.username, password: hashed, name: user.name, role: user.role },
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

  // Seed API scope definitions from the registry constant
  console.log("\nSeeding API scope definitions…")
  const allScopeIds = API_REGISTRY.flatMap((cat) => cat.scopes.map((s) => s.id))

  for (const category of API_REGISTRY) {
    for (const scope of category.scopes) {
      await prisma.apiScopeDefinition.upsert({
        where: { id: scope.id },
        update: {
          categoryId: category.id,
          categoryLabel: category.label,
          permission: scope.permission,
          label: scope.label,
          description: scope.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          endpoints: scope.endpoints as any,
          isActive: true,
        },
        create: {
          id: scope.id,
          categoryId: category.id,
          categoryLabel: category.label,
          permission: scope.permission,
          label: scope.label,
          description: scope.description,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          endpoints: scope.endpoints as any,
        },
      })
      console.log(`  ✓ scope  ${scope.id}`)
    }
  }

  // Mark scopes removed from the registry as inactive
  await prisma.apiScopeDefinition.updateMany({
    where: { id: { notIn: allScopeIds }, isActive: true },
    data: { isActive: false },
  })

  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
