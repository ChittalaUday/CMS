/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict"

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://udaychittala@localhost:5432/cms?schema=public"

// Stub the request-scoped modules the actions import: session, cookies and cache.
const Module = require("module")
let session: { id: string; role: string; clientId: string | null } | null = null
let activeClient: string | null = null
const stubs: Record<string, unknown> = {
  "@/lib/auth/session": { getSession: async () => session },
  "next/headers": {
    cookies: async () => ({ get: (k: string) => (k === "cms_active_client" && activeClient ? { value: activeClient } : undefined) }),
    headers: async () => new Headers(),
  },
  "next/cache": { revalidatePath: () => {}, revalidateTag: () => {} },
}
const origLoad = Module._load
Module._load = function (request: string, ...rest: unknown[]) {
  return request in stubs ? stubs[request] : origLoad.call(this, request, ...rest)
}

async function main() {
  const { prisma } = require("../../src/lib/db/prisma")
  const { createEditor } = require("../../src/app/_actions/users")
  const { toggleFeatured } = require("../../src/app/dashboard/blogs/actions")
  const { moveRecordToClient } = require("../../src/app/dashboard/clients/move-actions")

  const tag = Date.now()
  const [own, other] = await Promise.all(
    ["own", "other"].map((n) => prisma.client.create({ data: { name: `t-${n}`, slug: `t-${n}-${tag}` } })),
  )
  const superAdmin = await prisma.user.create({
    data: { email: `sa-${tag}@t.test`, username: `sa_${tag}`, name: "SA", password: "x", role: "SUPER_ADMIN", clientId: own.id },
  })
  const adminA = await prisma.user.create({
    data: { email: `a-${tag}@t.test`, username: `a_${tag}`, name: "A", password: "x", role: "ADMIN", clientId: own.id },
  })
  const post = await prisma.post.create({
    data: { title: "t", slug: `t-${tag}`, content: "", authorId: adminA.id, clientId: other.id },
  })

  try {
    // Super admin whose own client is `own`, working in `other`: the invite must land in `other`.
    session = superAdmin
    activeClient = other.id
    const res = await createEditor({ email: `inv-${tag}@t.test`, username: `inv_${tag}`, name: "Inv", role: "EDITOR" })
    assert.ok(res?.data, `createEditor failed: ${JSON.stringify(res?.serverError)}`)
    const invited = await prisma.user.findUnique({ where: { id: res.data.id }, include: { invite: true } })
    assert.equal(invited.clientId, other.id, "invited user must take the active client")
    assert.equal(invited.invite.clientId, other.id, "invite must take the active client")

    // Super admin with no active client picks one in the form.
    activeClient = null
    const picked = await createEditor({ email: `pick-${tag}@t.test`, username: `pick_${tag}`, name: "Pick", role: "EDITOR", clientId: other.id })
    assert.ok(picked?.data, `createEditor with a picked client failed: ${JSON.stringify(picked?.serverError)}`)
    assert.equal((await prisma.user.findUnique({ where: { id: picked.data.id } })).clientId, other.id)

    // ...and with neither a pick nor an active client it refuses.
    const none = await createEditor({ email: `none-${tag}@t.test`, username: `none_${tag}`, name: "None", role: "EDITOR" })
    assert.ok(none?.serverError, "creating without any client must fail")

    // An ADMIN passing another client's id is ignored: the user lands in the admin's own client.
    session = adminA
    const sneaky = await createEditor({ email: `sn-${tag}@t.test`, username: `sn_${tag}`, name: "Sn", role: "EDITOR", clientId: other.id })
    assert.ok(sneaky?.data, `createEditor as admin failed: ${JSON.stringify(sneaky?.serverError)}`)
    assert.equal((await prisma.user.findUnique({ where: { id: sneaky.data.id } })).clientId, own.id)

    // An ADMIN of `own` cannot change a post of `other`.
    session = adminA
    activeClient = null
    await assert.rejects(() => toggleFeatured(post.id))
    assert.equal((await prisma.post.findUnique({ where: { id: post.id } })).featured, post.featured)

    // Only a super admin can move a record to another client.
    await assert.rejects(() => moveRecordToClient("post", post.id, own.id), /SUPER_ADMIN only/)
    session = superAdmin
    await moveRecordToClient("post", post.id, own.id)
    assert.equal((await prisma.post.findUnique({ where: { id: post.id } })).clientId, own.id)

    console.log("tenancy: ok")
  } finally {
    const users = { clientId: { in: [own.id, other.id] } }
    await prisma.userInvite.deleteMany({ where: { OR: [users, { invitedBy: users }] } })
    await prisma.post.deleteMany({ where: { id: post.id } })
    await prisma.user.deleteMany({ where: users })
    await prisma.client.deleteMany({ where: { id: { in: [own.id, other.id] } } })
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
