import assert from "node:assert/strict"
import { Role } from "@/generated/prisma/enums"
import { canAccessApiDocs, API_DOCS_ACCESS_ROLES } from "@/lib/auth/roles"

console.log("Testing API Docs Role Access Control...")

// Only Devs and Admins (SUPER_ADMIN, ADMIN) can view API docs
assert.equal(canAccessApiDocs(Role.SUPER_ADMIN), true, "SUPER_ADMIN should have access to API docs")
assert.equal(canAccessApiDocs(Role.ADMIN), true, "ADMIN should have access to API docs")
assert.equal(canAccessApiDocs(Role.DEVELOPER), true, "DEVELOPER should have access to API docs")

// HR and Editor should NOT have access to API docs
assert.equal(canAccessApiDocs(Role.HR), false, "HR must NOT have access to API docs")
assert.equal(canAccessApiDocs(Role.EDITOR), false, "EDITOR must NOT have access to API docs")

// Verify API_DOCS_ACCESS_ROLES includes exactly DEV, ADMIN, and SUPER_ADMIN
assert.deepEqual(
  [...API_DOCS_ACCESS_ROLES].sort(),
  [Role.ADMIN, Role.DEVELOPER, Role.SUPER_ADMIN].sort(),
  "API_DOCS_ACCESS_ROLES should only contain ADMIN, DEVELOPER, and SUPER_ADMIN"
)

console.log("✅ All API Docs Role Access tests passed successfully!")
