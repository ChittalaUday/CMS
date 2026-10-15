import assert from "node:assert";

process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://udaychittala@localhost:5432/cms?schema=public";
process.env.UMAMI_URL = "http://umami.test:3000";
process.env.UMAMI_USERNAME = "admin";
process.env.UMAMI_PASSWORD = "pw";

type Call = { url: string; method: string; auth: string | null };
const calls: Call[] = [];
let logins = 0;
let failNextWith401 = false;
let nextWebsiteId = 1;

// Stand-in for Umami: login, stats, website creation.
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const headers = new Headers(init?.headers);
  calls.push({ url, method: init?.method ?? "GET", auth: headers.get("authorization") });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  if (url.endsWith("/api/auth/login")) return json({ token: `token-${++logins}` });
  if (failNextWith401 && url.includes("/stats")) {
    failNextWith401 = false;
    return json({ error: "expired" }, 401);
  }
  if (url.includes("/stats")) return json({ pageviews: 10, visitors: 4, visits: 5, bounces: 1, totaltime: 50, comparison: { pageviews: 5, visitors: 2, visits: 5, bounces: 1, totaltime: 50 } });
  if (url.includes("/api/websites?page=")) {
    const page = Number(new URL(url).searchParams.get("page"));
    return json({
      data:
        page === 1
          ? Array.from({ length: 100 }, (_, i) => ({ id: `filler-${i}`, name: "f", domain: `filler-${i}.example.com` }))
          : [{ id: "existing-site", name: "Already there", domain: "existing.example.com" }],
    });
  }
  if (url.endsWith("/api/websites") && init?.method === "POST") {
    const { name, domain } = JSON.parse(String(init.body));
    return json({ id: `site-${nextWebsiteId++}`, name, domain });
  }
  return json({ error: "unexpected" }, 500);
}) as typeof fetch;

async function run() {
  const { prisma } = await import("../../src/lib/db/prisma");
  const schema = await import("../../src/lib/analytics/schema");
  const umami = await import("../../src/lib/analytics/umami");
  const sites = await import("../../src/lib/analytics/sites");

  console.log("=================================================");
  console.log("        RUNNING ANALYTICS UNIT SUITE             ");
  console.log("=================================================");

  // 1. Domain normalisation and validation
  assert.strictEqual(schema.normalizeDomain(" HTTPS://WWW.Example.com:8080/a/b?x=1#h "), "www.example.com");
  assert.strictEqual(schema.siteInputSchema.parse({ name: " Zenith ", domain: "https://zenithfilings.com/" }).domain, "zenithfilings.com");
  assert.ok(!schema.siteInputSchema.safeParse({ name: "x", domain: "not a domain" }).success);
  assert.ok(!schema.siteInputSchema.safeParse({ name: "", domain: "a.com" }).success);
  assert.strictEqual(schema.normalizeDomain("https://user:pw@example.com/x"), "example.com", "userinfo is stripped");
  assert.ok(schema.siteInputSchema.safeParse({ name: "x", domain: "example.xn--p1ai" }).success, "punycode TLD is valid");
  console.log("✓ Test 1: domain normalisation and validation");

  // 2. Ranges and percent change
  const r = schema.resolveRange("30d", 1_000_000_000_000);
  assert.strictEqual(r.endAt - r.startAt, 30 * 86400_000);
  assert.strictEqual(schema.resolveRange("bogus").key, "7d", "unknown range falls back to the default");
  assert.deepStrictEqual(schema.percentChange(15, 10), { value: 50, direction: "up" });
  assert.deepStrictEqual(schema.percentChange(5, 10), { value: 50, direction: "down" });
  assert.strictEqual(schema.percentChange(5, 0), null, "no previous period, no trend");
  console.log("✓ Test 2: ranges and percent change");

  // 3. settings parsing is defensive (shared free-form JSON column)
  assert.deepStrictEqual(schema.parseSites(null), []);
  assert.deepStrictEqual(schema.parseSites({ analytics: { sites: "nope" } }), []);
  assert.deepStrictEqual(
    schema.parseSites({ analytics: { sites: [{ name: "A", domain: "a.com", websiteId: "1" }, { name: 5 }, null] } }),
    [{ name: "A", domain: "a.com", websiteId: "1" }]
  );
  console.log("✓ Test 3: settings parsing ignores malformed entries");

  // 4. Umami client: one login reused, 401 triggers a single re-login and retry
  const w = { startAt: 1, endAt: 2 };
  const [first] = await Promise.all([umami.getStats("abc", w), umami.getStats("abc", w), umami.getStats("abc", w)]);
  assert.strictEqual(first.pageviews, 10);
  assert.strictEqual(logins, 1, "three parallel cold calls share a single login");
  await umami.getStats("abc", w);
  assert.strictEqual(logins, 1, "token is cached");
  assert.ok(calls.at(-1)!.url.includes("/api/websites/abc/stats?startAt=1&endAt=2"));
  assert.strictEqual(calls.at(-1)!.auth, "Bearer token-1");
  failNextWith401 = true;
  await umami.getStats("abc", w);
  assert.strictEqual(logins, 2, "expired token is replaced once");
  assert.strictEqual(calls.at(-1)!.auth, "Bearer token-2");
  console.log("✓ Test 4: Umami client shares one login, caches the token and retries once on 401");

  // 5. Site registry: add, duplicate guard, preserves other settings keys, remove, overview
  const stamp = Date.now();
  const client = await prisma.client.create({
    data: { name: `An ${stamp}`, slug: `an-test-${stamp}`, settings: { careers: { keep: "me" } } },
  });
  try {
    const added = await sites.addSite(client.id, { name: "Zenith", domain: "zenithfilings.com" });
    assert.ok(added.websiteId.startsWith("site-"));
    const row = await prisma.client.findUnique({ where: { id: client.id }, select: { settings: true } });
    assert.deepStrictEqual((row!.settings as Record<string, unknown>).careers, { keep: "me" }, "other settings preserved");
    assert.strictEqual((await sites.getClientSites(client.id)).length, 1);
    await assert.rejects(() => sites.addSite(client.id, { name: "Dup", domain: "zenithfilings.com" }), /already tracked/);
    assert.strictEqual((await sites.getClientSites(client.id)).length, 1, "duplicate did not create a second link");
    const all = await sites.listAllClientSites();
    assert.ok(all.some((g) => g.client.id === client.id && g.sites.length === 1), "appears in the all-clients overview");
    const reused = await sites.addSite(client.id, { name: "Reuse", domain: "existing.example.com" });
    assert.strictEqual(reused.websiteId, "existing-site", "an existing Umami website for the domain is reused, not duplicated");
    // Another client must not be able to claim a website this client already has linked.
    const other = await prisma.client.create({ data: { name: `Other ${stamp}`, slug: `an-other-${stamp}` } });
    try {
      await assert.rejects(
        () => sites.addSite(other.id, { name: "Steal", domain: "existing.example.com" }),
        /already tracked by another client/
      );
      assert.deepStrictEqual(await sites.getClientSites(other.id), [], "nothing was linked to the other client");
      // Parallel adds of the same new domain: exactly one wins.
      const results = await Promise.allSettled([
        sites.addSite(other.id, { name: "Race", domain: "race.example.com" }),
        sites.addSite(other.id, { name: "Race", domain: "race.example.com" }),
      ]);
      assert.strictEqual(results.filter((r) => r.status === "fulfilled").length, 1, "double submit adds the site once");
      assert.strictEqual((await sites.getClientSites(other.id)).length, 1);
      await assert.rejects(() => sites.removeSite("no-such-client", "x"), /Client not found/);
    } finally {
      await prisma.client.delete({ where: { id: other.id } });
    }
    await sites.removeSite(client.id, reused.websiteId);
    await sites.removeSite(client.id, added.websiteId);
    assert.deepStrictEqual(await sites.getClientSites(client.id), []);
    const after = await prisma.client.findUnique({ where: { id: client.id }, select: { settings: true } });
    assert.deepStrictEqual((after!.settings as Record<string, unknown>).careers, { keep: "me" }, "still preserved after remove");
    console.log("✓ Test 5: registry add / reuse (paginated lookup) / cross-client guard / double-submit / remove keep other settings");
  } finally {
    await prisma.client.delete({ where: { id: client.id } });
  }

  console.log("\nAll analytics tests passed.");
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
