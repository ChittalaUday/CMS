import assert from "node:assert/strict"
import { getInitials, generateInitialsAvatar } from "../../src/lib/utils/avatar"

function runAvatarTests() {
  console.log("Testing getInitials...")
  assert.equal(getInitials("Admin User"), "AU")
  assert.equal(getInitials("John Doe"), "JD")
  assert.equal(getInitials("Jane Mary Watson"), "JW")
  assert.equal(getInitials("Admin"), "AD")
  assert.equal(getInitials("Uday"), "UD")
  assert.equal(getInitials("A"), "A")
  assert.equal(getInitials("admin.user"), "AU")
  assert.equal(getInitials("john-doe"), "JD")
  assert.equal(getInitials("uday_chittala"), "UC")
  assert.equal(getInitials(""), "U")
  assert.equal(getInitials(null), "U")
  assert.equal(getInitials(undefined), "U")
  assert.equal(getInitials("   "), "U")
  console.log("✓ getInitials tests passed")

  console.log("Testing generateInitialsAvatar...")
  const avatar = generateInitialsAvatar("Admin User")
  assert.ok(avatar.startsWith("data:image/svg+xml;utf8,"), "Must start with data URI prefix")
  const decoded = decodeURIComponent(avatar.replace("data:image/svg+xml;utf8,", ""))
  assert.ok(decoded.includes("<svg"), "Must contain <svg")
  assert.ok(decoded.includes(">AU<"), "Must contain >AU< initials")

  const custom = generateInitialsAvatar("Uday", {
    background: "#ff0000",
    color: "#000000",
    size: 48,
  })
  const customDecoded = decodeURIComponent(custom.replace("data:image/svg+xml;utf8,", ""))
  assert.ok(customDecoded.includes('fill="#ff0000"'), "Must include custom bg")
  assert.ok(customDecoded.includes('fill="#000000"'), "Must include custom color")
  assert.ok(customDecoded.includes('width="48"'), "Must include custom size")
  console.log("✓ generateInitialsAvatar tests passed")

  console.log("All avatar tests passed successfully!")
}

runAvatarTests()
