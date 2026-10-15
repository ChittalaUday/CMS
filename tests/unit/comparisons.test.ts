import assert from "node:assert";
import { prisma } from "../../src/lib/db/prisma";
import {
  createComparison,
  updateComparison,
  deleteComparison,
  setComparisonPublished,
  moveComparison,
  ComparisonError,
} from "../../src/lib/comparisons/service";
import { getPublicComparison, getPublicComparisons } from "../../src/app/dashboard/_data/comparisons-queries";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://udaychittala@localhost:5432/cms?schema=public";

async function rejects(fn: () => Promise<unknown>, message: RegExp) {
  await assert.rejects(fn, (e: unknown) => e instanceof ComparisonError && message.test(e.message));
}

async function run() {
  console.log("=================================================");
  console.log("        RUNNING COMPARISONS UNIT SUITE           ");
  console.log("=================================================");

  const stamp = Date.now();
  const [clientA, clientB] = await Promise.all(
    ["a", "b"].map((s) =>
      prisma.client.create({ data: { name: `Cmp ${s}`, slug: `cmp-test-${s}-${stamp}` } })
    )
  );

  try {
    // 1. Create with grid; short value rows are padded with ""
    const created = await createComparison(clientA.id, {
      title: "LLP vs Pvt Ltd",
      slug: `llp-vs-pvt-${stamp}`,
      published: true,
      relatedServiceSlugs: ["llp-registration"],
      options: [
        { label: "LLP", linkSlug: "llp-registration" },
        { label: "Private Limited", linkSlug: "" },
      ],
      criteria: [
        { label: "Members", values: ["2", "2 shareholders"] },
        { label: "Audit", values: ["Above threshold"] }, // missing second cell
      ],
    });
    let pub = await getPublicComparison(clientA.id, created.slug);
    assert.ok(pub, "published comparison is readable");
    assert.deepStrictEqual(pub.options.map((o) => [o.label, o.linkSlug]), [["LLP", "llp-registration"], ["Private Limited", null]]);
    assert.deepStrictEqual(pub.criteria.map((c) => c.values), [["2", "2 shareholders"], ["Above threshold", ""]]);
    console.log("✓ Test 1: create with grid, values aligned to options, missing cell -> empty string");

    // 2. Update replaces options and criteria, cells stay consistent
    await updateComparison(clientA.id, created.id, {
      title: "LLP vs Pvt Ltd vs OPC",
      slug: created.slug,
      published: true,
      options: [
        { label: "Private Limited" },
        { label: "OPC" },
        { label: "LLP" },
      ],
      criteria: [{ label: "Members", values: ["2", "1", "2"] }],
    });
    pub = await getPublicComparison(clientA.id, created.slug);
    assert.deepStrictEqual(pub?.options.map((o) => o.label), ["Private Limited", "OPC", "LLP"]);
    assert.deepStrictEqual(pub?.criteria.map((c) => c.values), [["2", "1", "2"]]);
    const cellCount = await prisma.comparisonCell.count({ where: { criterion: { comparisonId: created.id } } });
    assert.strictEqual(cellCount, 3, "one cell per criterion x option, none left over");
    console.log("✓ Test 2: update replaces grid, cells consistent");

    // 3. Validation and duplicate slug
    await rejects(
      () => createComparison(clientA.id, { title: "x", slug: "Bad Slug", options: [], criteria: [] }),
      /lowercase/i
    );
    await rejects(
      () => createComparison(clientA.id, { title: "x", slug: "ok-slug", published: true, options: [{ label: "A" }], criteria: [] }),
      /at least 2 columns/
    );
    await rejects(
      () => createComparison(clientA.id, { title: "dup", slug: created.slug, options: [], criteria: [] }),
      /already exists/
    );
    // same slug is fine for another client
    const other = await createComparison(clientB.id, { title: "Other client", slug: created.slug, options: [], criteria: [] });
    console.log("✓ Test 3: validation, duplicate slug per client");

    // 4. Client scoping
    assert.strictEqual(await getPublicComparison(clientB.id, created.slug), null, "unpublished/other client hidden");
    await rejects(
      () => updateComparison(clientB.id, created.id, { title: "hijack", slug: created.slug, options: [], criteria: [] }),
      /not found/i
    );
    await rejects(() => deleteComparison(clientB.id, created.id), /not found/i);
    await rejects(() => setComparisonPublished(clientB.id, created.id, false), /not found/i);
    assert.ok(await prisma.comparison.findUnique({ where: { id: created.id } }), "still there");
    console.log("✓ Test 4: other client cannot update, delete or toggle");

    // 5. Publish toggle gates the public API
    await setComparisonPublished(clientA.id, created.id, false);
    assert.strictEqual(await getPublicComparison(clientA.id, created.slug), null);
    await setComparisonPublished(null, created.id, true); // null = unrestricted (super admin, no client chosen)
    assert.ok(await getPublicComparison(clientA.id, created.slug));
    await rejects(() => setComparisonPublished(clientB.id, other.id, true), /at least 2 columns/);
    console.log("✓ Test 5: publish toggle");

    // 6. Public list: published only, ordered by position then title, with optionLabels and pagination
    const second = await createComparison(clientA.id, {
      title: "Aardvark first alphabetically",
      slug: `second-${stamp}`,
      published: true,
      options: [{ label: "X" }, { label: "Y" }],
      criteria: [{ label: "r", values: ["1", "2"] }],
    });
    await createComparison(clientA.id, { title: "Draft", slug: `draft-${stamp}`, options: [], criteria: [] });
    let list = await getPublicComparisons(clientA.id, 1, 50);
    assert.deepStrictEqual(list.comparisons.map((c) => c.id), [created.id, second.id], "position beats title");
    assert.deepStrictEqual(list.comparisons[0].optionLabels, ["Private Limited", "OPC", "LLP"]);
    assert.strictEqual(list.pagination.total, 2);
    await moveComparison(clientA.id, second.id, "up");
    list = await getPublicComparisons(clientA.id, 1, 1);
    assert.strictEqual(list.comparisons[0].id, second.id, "moved up");
    assert.deepStrictEqual(list.pagination, { total: 2, page: 1, limit: 1, totalPages: 2 });
    console.log("✓ Test 6: public list ordering, pagination, reorder");

    // 7. Delete cascades the grid
    await deleteComparison(clientA.id, created.id);
    assert.strictEqual(await prisma.comparisonOption.count({ where: { comparisonId: created.id } }), 0);
    assert.strictEqual(await prisma.comparisonCriterion.count({ where: { comparisonId: created.id } }), 0);
    console.log("✓ Test 7: delete cascades options, criteria and cells");

    // 8. Unknown ids report "not found" (not a grid error); extra cells are rejected, not dropped
    await rejects(() => setComparisonPublished(clientA.id, "does-not-exist", true), /not found/i);
    await rejects(
      () =>
        createComparison(clientA.id, {
          title: "Too many cells",
          slug: `too-many-${stamp}`,
          options: [{ label: "X" }, { label: "Y" }],
          criteria: [{ label: "r", values: ["1", "2", "3"] }],
        }),
      /more cells than there are columns/
    );
    // Grid writes keep order and alignment with many rows (batched inserts)
    const big = await createComparison(clientA.id, {
      title: "Big",
      slug: `big-${stamp}`,
      options: Array.from({ length: 8 }, (_, i) => ({ label: `O${i}` })),
      criteria: Array.from({ length: 60 }, (_, r) => ({ label: `R${r}`, values: Array.from({ length: 8 }, (_, c) => `${r}:${c}`) })),
    });
    assert.strictEqual(await prisma.comparisonCell.count({ where: { criterion: { comparisonId: big.id } } }), 480);
    console.log("✓ Test 8: unknown id, cell-count check, 60x8 batched write");
  } finally {
    await prisma.comparison.deleteMany({ where: { clientId: { in: [clientA.id, clientB.id] } } });
    await prisma.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } });
  }

  console.log("\nAll comparison tests passed.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
