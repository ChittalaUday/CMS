# Sub-task 00-01 — Schema & Migration

**Status:** TODO  
**Effort:** ~0.5 day  
**Depends on:** nothing (start here)  
**Blocks:** 00-02, 00-03, 00-04, 00-05

---

## Goal

Add the `Client` and `ClientApiKey` models to the Prisma schema, add nullable `clientId` FKs to all existing data models, run the migration, and backfill all existing rows to a "Default" client.

---

## Steps

### 1. Update `prisma/schema.prisma`

**Add new enum:**
```prisma
enum ClientStatus {
  ACTIVE
  SUSPENDED
  INACTIVE
}
```

**Add new models:**
```prisma
model Client {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  domain      String?
  description String?
  logoUrl     String?
  status      ClientStatus @default(ACTIVE)
  createdById String?
  createdBy   User?        @relation("ClientCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  users       User[]       @relation("ClientUsers")
  posts       Post[]
  jobPostings JobPosting[]
  media       Media[]
  categories  Category[]
  apiKeys     ClientApiKey[]

  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([slug])
  @@index([status])
}

model ClientApiKey {
  id          String    @id @default(cuid())
  clientId    String
  client      Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  name        String
  keyHash     String    @unique
  keyPrefix   String
  scopes      String[]  @default(["read:blogs", "read:careers", "write:applications"])
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdById String?
  createdBy   User?     @relation("ApiKeyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime  @default(now())

  @@index([clientId])
  @@index([keyHash])
}
```

**Add `clientId` (nullable) to existing models:**
- `User` — `@relation("ClientUsers")`
- `Post`
- `JobPosting`
- `Media`
- `Category`
- `UserInvite`

Keep all `clientId` columns **nullable** in this migration.

### 2. Run first migration

```bash
npm run prisma:generate
npm run prisma:migrate
# Name: add_multitenancy_nullable
```

### 3. Create and run the backfill script

File: `prisma/migrations/backfill-default-client.ts`

```ts
import { prisma } from '../../src/lib/prisma'

async function backfill() {
  const defaultClient = await prisma.client.upsert({
    where: { slug: 'default' },
    create: { name: 'Default', slug: 'default', status: 'ACTIVE' },
    update: {},
  })

  const id = defaultClient.id

  await prisma.post.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.jobPosting.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.media.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.category.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.userInvite.updateMany({ where: { clientId: null }, data: { clientId: id } })
  await prisma.user.updateMany({
    where: { clientId: null, role: { not: 'SUPER_ADMIN' } },
    data: { clientId: id },
  })

  console.log('Backfill complete. Default clientId:', id)
}

backfill().catch(console.error).finally(() => prisma.$disconnect())
```

Run: `npx tsx prisma/migrations/backfill-default-client.ts`

### 4. (Optional) Second migration — enforce NOT NULL

After verifying backfill, run a second migration making `clientId NOT NULL` on `Post`, `JobPosting`, `Category`.  
Keep nullable on `User` (SUPER_ADMIN has no client) and `Media`.

---

## Acceptance Criteria

- [ ] `Client` and `ClientApiKey` tables exist in the DB
- [ ] `clientId` column present on `User`, `Post`, `JobPosting`, `Media`, `Category`, `UserInvite`
- [ ] Backfill script runs without errors
- [ ] All non-SUPER_ADMIN users have `clientId` set
- [ ] All posts, jobs, media, categories have `clientId` set
- [ ] `prisma:generate` completes without errors
