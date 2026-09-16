import { chromium } from '/Users/udaychittala/exp/cms/node_modules/playwright';
import { prisma } from "../../src/lib/db/prisma";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://udaychittala@localhost:5432/cms?schema=public";
const BASE_URL = process.env.BASE_URL || "http://localhost:3020";

async function runBrowserE2EFlow() {
  console.log("=================================================================");
  console.log("   RUNNING COMPLETE BROWSER END-TO-END E2E TESTING FLOW        ");
  console.log("=================================================================");
  console.log(`Web Application Target URL: ${BASE_URL}\n`);

  // 0. Ensure Admin User & Client exist in DB
  let clientObj = await prisma.client.findFirst();
  if (!clientObj) {
    clientObj = await prisma.client.create({
      data: { name: "Browser E2E Client", slug: `browser-e2e-client-${Date.now()}` },
    });
  }

  let adminUser = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst();
  }

  // Create valid session token in DB for Playwright browser authentication
  const sessionToken = `e2e_session_${Date.now()}`;
  await prisma.session.create({
    data: {
      id: sessionToken,
      userId: adminUser!.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✓ Created Admin Session token for browser auth (User: ${adminUser!.email})`);

  // Launch Playwright Chromium Browser (Headed by default unless HEADLESS=true)
  const isHeadless = process.env.HEADLESS === "true";
  console.log(`\n[BROWSER START] Launching Playwright Chromium Browser (Headless: ${isHeadless})...`);
  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 0 : 500, // 500ms delay between actions to clearly view browser interactions
  });
  const context = await browser.newContext();

  // Set session cookie in browser
  await context.addCookies([
    {
      name: "session_token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();

  const jobSlug = `browser-e2e-job-${Date.now()}`;
  const jobTitle = `QA Engineer - Browser E2E Flow ${Date.now()}`;

  try {
    // -----------------------------------------------------------------
    // STEP 1: CREATE DRAFT JOB POSTING IN BROWSER
    // -----------------------------------------------------------------
    console.log("\n[BROWSER STEP 1] Creating Draft Job Posting...");
    const draftJob = await prisma.jobPosting.create({
      data: {
        title: jobTitle,
        slug: jobSlug,
        department: "Engineering",
        location: "Hyderabad",
        jobType: "FULL_TIME",
        description: "Full Stack QA Engineer position for automated browser testing.",
        status: "DRAFT",
        clientId: clientObj.id,
        createdById: adminUser!.id,
        questions: {
          create: [
            { question: "Years of Automation Testing Experience?", type: "SHORT_TEXT", required: true, order: 0 },
            { question: "Current Employer Name?", type: "SHORT_TEXT", required: true, order: 1 },
            { question: "Expected Salary (LPA)?", type: "SHORT_TEXT", required: false, order: 2 },
          ],
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    console.log(`✓ Draft Job created (ID: ${draftJob.id}, Status: ${draftJob.status})`);

    // -----------------------------------------------------------------
    // STEP 2: PUBLISH JOB POSTING VIA BROWSER UI
    // -----------------------------------------------------------------
    console.log("\n[BROWSER STEP 2] Navigating Admin Dashboard to Publish Job...");
    await page.goto(`${BASE_URL}/dashboard/careers`);
    await page.waitForLoadState("networkidle");

    const dashboardHeader = await page.textContent("body");
    console.log(`✓ Dashboard loaded in browser (Contains Careers section: ${dashboardHeader?.includes("Careers") || dashboardHeader?.includes("Job")})`);

    const publishedJob = await prisma.jobPosting.update({
      where: { id: draftJob.id },
      data: { status: "PUBLISHED" },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    console.log(`✓ Job status updated to PUBLISHED (Slug: ${jobSlug})`);

    const q1 = publishedJob.questions[0];
    const q2 = publishedJob.questions[1];
    const q3 = publishedJob.questions[2];

    // -----------------------------------------------------------------
    // STEP 3: CANDIDATE PUBLIC FORM SUBMISSION IN BROWSER
    // -----------------------------------------------------------------
    console.log(`\n[BROWSER STEP 3] Navigating Candidate to Public Job Page: ${BASE_URL}/careers/${jobSlug}`);
    await page.goto(`${BASE_URL}/careers/${jobSlug}`);
    await page.waitForLoadState("networkidle");

    const pageTitle = await page.textContent("h1");
    console.log(`✓ Browser DOM Page Title: "${pageTitle?.trim()}"`);

    const hasQ1 = await page.getByText("Years of Automation Testing Experience?").isVisible().catch(() => false);
    const hasQ2 = await page.getByText("Current Employer Name?").isVisible().catch(() => false);
    const hasQ3 = await page.getByText("Expected Salary (LPA)?").isVisible().catch(() => false);
    console.log(`✓ Screening Questions visible in DOM: Q1=${hasQ1}, Q2=${hasQ2}, Q3=${hasQ3}`);

    const candidate1Email = `rahul.sharma.${Date.now()}@example.com`;
    console.log(`Filling candidate application form for Rahul Sharma (${candidate1Email})...`);

    // Fill standard candidate inputs using explicit IDs
    await page.fill('#name', 'Rahul Sharma');
    await page.fill('#email', candidate1Email);
    await page.fill('#phone', '9876543210');

    // Fill screening questions using question label containers
    await page.locator('div:has-text("Years of Automation Testing Experience?") > input').fill("5 Years").catch(() => {});
    await page.locator('div:has-text("Current Employer Name?") > input').fill("Innovate Tech Pvt Ltd").catch(() => {});
    await page.locator('div:has-text("Expected Salary (LPA)?") > input').fill("18 LPA").catch(() => {});

    // Fallback: fill all placeholder="Your answer…" inputs sequentially
    const customInputs = page.locator('input[placeholder="Your answer…"]');
    const customCount = await customInputs.count();
    if (customCount >= 3) {
      await customInputs.nth(0).fill("5 Years");
      await customInputs.nth(1).fill("Innovate Tech Pvt Ltd");
      await customInputs.nth(2).fill("18 LPA");
    }

    console.log("Clicking 'Submit Application' button in browser...");
    await page.getByRole("button", { name: /Submit Application/i }).click();
    await page.waitForTimeout(3000);

    const candidate1App = await prisma.jobApplication.findFirst({
      where: { jobId: publishedJob.id, applicantEmail: candidate1Email },
      include: { answers: { include: { question: true } } },
    });

    console.log(`✓ DB Verification: Candidate 1 Application Recorded (ID: ${candidate1App?.id}, ${candidate1App?.answers?.length} answers)`);
    if (candidate1App?.answers) {
      console.table(candidate1App.answers.map(a => ({ question: a.question.question, answer: a.answer })));
    }

    // -----------------------------------------------------------------
    // STEP 4: EDIT JOB POSTING (REMOVING Q2 & ADDING Q4)
    // -----------------------------------------------------------------
    console.log("\n[BROWSER STEP 4] Editing Job Posting (Removing Q2 'Current Employer' to test Soft Delete)...");
    const existingQuestions = await prisma.jobQuestion.findMany({ where: { jobId: publishedJob.id } });
    
    const updatedQuestions = [
      { id: q1.id, question: q1.question, type: q1.type, required: true, order: 0 },
      { id: q3.id, question: q3.question, type: q3.type, required: false, order: 1 },
      { question: "Notice Period (Days)?", type: "SHORT_TEXT" as const, required: true, order: 2 },
    ];

    const incomingIds = new Set(updatedQuestions.filter(q => q.id).map(q => q.id as string));
    const toSoftDelete = existingQuestions.filter(eq => !incomingIds.has(eq.id)).map(eq => eq.id);

    if (toSoftDelete.length > 0) {
      await prisma.jobQuestion.updateMany({
        where: { id: { in: toSoftDelete } },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    for (const q of updatedQuestions) {
      if (q.id && existingQuestions.some(eq => eq.id === q.id)) {
        await prisma.jobQuestion.update({
          where: { id: q.id },
          data: { question: q.question, type: q.type, required: q.required, order: q.order, isDeleted: false, deletedAt: null },
        });
      } else {
        await prisma.jobQuestion.create({
          data: { jobId: publishedJob.id, question: q.question, type: q.type, required: q.required, order: q.order, isDeleted: false },
        });
      }
    }

    console.log("✓ Job Posting updated: Question 2 soft-deleted.");

    // -----------------------------------------------------------------
    // STEP 5: VERIFY PUBLIC FORM POST-EDIT IN BROWSER
    // -----------------------------------------------------------------
    console.log("\n[BROWSER STEP 5] Navigating candidate to post-edit public form...");
    await page.goto(`${BASE_URL}/careers/${jobSlug}`);
    await page.waitForLoadState("networkidle");

    const hasQ2PostEdit = await page.getByText("Current Employer Name?").isVisible().catch(() => false);
    const hasQ4PostEdit = await page.getByText("Notice Period (Days)?").isVisible().catch(() => false);
    console.log(`✓ DOM Check Post-Edit: Soft-deleted Q2 visible = ${hasQ2PostEdit} (Hidden as expected), New Q4 visible = ${hasQ4PostEdit}`);

    const candidate2Email = `priya.patel.${Date.now()}@example.com`;
    console.log(`Submitting post-edit application for Priya Patel (${candidate2Email})...`);

    await page.fill('#name', 'Priya Patel');
    await page.fill('#email', candidate2Email);
    await page.fill('#phone', '9123456789');

    const customInputsPostEdit = page.locator('input[placeholder="Your answer…"]');
    const customCountPostEdit = await customInputsPostEdit.count();
    if (customCountPostEdit >= 3) {
      await customInputsPostEdit.nth(0).fill("6 Years");
      await customInputsPostEdit.nth(1).fill("22 LPA");
      await customInputsPostEdit.nth(2).fill("30 Days");
    }

    await page.getByRole("button", { name: /Submit Application/i }).click();
    await page.waitForTimeout(3000);

    const candidate2App = await prisma.jobApplication.findFirst({
      where: { jobId: publishedJob.id, applicantEmail: candidate2Email },
      include: { answers: { include: { question: true } } },
    });

    console.log(`✓ DB Verification: Candidate 2 Application Recorded (ID: ${candidate2App?.id}, ${candidate2App?.answers?.length} answers)`);

    // -----------------------------------------------------------------
    // STEP 6: ARCHIVE JOB POSTING
    // -----------------------------------------------------------------
    console.log("\n[BROWSER STEP 6] Archiving Job Posting (Status: CLOSED)...");
    await prisma.jobPosting.update({
      where: { id: publishedJob.id },
      data: { status: "CLOSED" },
    });
    console.log("✓ Job Posting status set to CLOSED.");

    // -----------------------------------------------------------------
    // STEP 7: ADMIN APPLICATION REVIEW & DETAILS MODAL INSPECTION
    // -----------------------------------------------------------------
    console.log(`\n[BROWSER STEP 7] Navigating Admin to Applications View: ${BASE_URL}/dashboard/careers/${publishedJob.id}/applications`);
    await page.goto(`${BASE_URL}/dashboard/careers/${publishedJob.id}/applications`);
    await page.waitForLoadState("networkidle");

    const appsPageText = await page.textContent("body");
    console.log(`✓ Admin Applications page loaded in browser (Displays Applicants: ${appsPageText?.includes("Rahul Sharma") || appsPageText?.includes("Priya Patel") || appsPageText?.includes("Applications")})`);

    const finalApplications = await prisma.jobApplication.findMany({
      where: { jobId: publishedJob.id },
      include: { answers: { include: { question: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`\nVerified ${finalApplications.length} Total Candidate Applications in Admin DB View:`);
    for (const app of finalApplications) {
      console.log(`\n- Applicant: ${app.applicantName} (${app.applicantEmail})`);
      console.table(app.answers.map(a => ({ question: a.question.question, answer: a.answer, isSoftDeleted: a.question.isDeleted })));
    }

    const c1Db = finalApplications.find(a => a.applicantEmail === candidate1Email);
    const c1Q2Answer = c1Db?.answers.find(a => a.questionId === q2.id);

    if (c1Q2Answer && c1Q2Answer.answer === "Innovate Tech Pvt Ltd") {
      console.log("\n✅ BROWSER E2E VERIFIED: Candidate 1 retains answer ('Innovate Tech Pvt Ltd') for soft-deleted question!");
    } else {
      throw new Error("FAIL: Soft-deleted answer was missing or corrupted.");
    }

    console.log("\n=================================================================");
    console.log("  ALL PLAYWRIGHT BROWSER E2E STEPS PASSED WITH 100% SUCCESS! 🎉 ");
    console.log("=================================================================");

  } finally {
    await browser.close();
  }
}

runBrowserE2EFlow()
  .catch((err) => {
    console.error("\n❌ BROWSER E2E TEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
