import assert from "node:assert";
import { parseSlugBase, generateNextAvailableSlug, toSlug } from "../../src/lib/careers/slug-helper";

console.log("=================================================");
console.log("       RUNNING SLUG HELPER UNIT TEST SUITE       ");
console.log("=================================================");

// Test 1: toSlug normalization
assert.strictEqual(toSlug("Project Manager"), "project-manager");
assert.strictEqual(toSlug("Senior Full Stack Developer/Team Lead"), "senior-full-stack-developer-team-lead");
assert.strictEqual(toSlug("  Software Engineer   "), "software-engineer");
console.log("✓ Test 1: toSlug normalization passed");

// Test 2: parseSlugBase
assert.deepStrictEqual(parseSlugBase("project-manager"), { base: "project-manager", suffixNumber: null });
assert.deepStrictEqual(parseSlugBase("project-manager-2"), { base: "project-manager", suffixNumber: 2 });
assert.deepStrictEqual(parseSlugBase("project-manager-7"), { base: "project-manager", suffixNumber: 7 });
assert.deepStrictEqual(parseSlugBase("project-manager-2-2"), { base: "project-manager", suffixNumber: 2 });
console.log("✓ Test 2: parseSlugBase passed");

// Test 3: generateNextAvailableSlug with base
const res1 = generateNextAvailableSlug("project-manager", ["project-manager"]);
assert.strictEqual(res1, "project-manager-2");

// Test 4: generateNextAvailableSlug incrementing existing number (NOT -2-2)
const res2 = generateNextAvailableSlug("project-manager-2", ["project-manager", "project-manager-2"]);
assert.strictEqual(res2, "project-manager-3");

const res3 = generateNextAvailableSlug("project-manager-7", ["project-manager", "project-manager-7"]);
assert.strictEqual(res3, "project-manager-8");

// Test 5: generateNextAvailableSlug cleaning up double hyphen numbers
const res4 = generateNextAvailableSlug("project-manager-2-2", ["project-manager", "project-manager-2"]);
assert.strictEqual(res4, "project-manager-3");

// Test 6: filling gaps
const res5 = generateNextAvailableSlug("project-manager", ["project-manager", "project-manager-2", "project-manager-4"]);
assert.strictEqual(res5, "project-manager-3");

console.log("✓ Test 3-6: generateNextAvailableSlug intelligent increment passed");
console.log("=================================================");
console.log("       SLUG HELPER UNIT TESTS ALL PASSED!        ");
console.log("=================================================");
