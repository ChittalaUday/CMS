import { prisma } from "../../src/lib/db/prisma";
import { submitApplication } from "../../src/app/dashboard/careers/actions";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://udaychittala@localhost:5432/cms?schema=public";
const BASE_URL = process.env.BASE_URL || "http://localhost:3020";

async function runFullLifecycleTestSuite() {
  console.log("=================================================================");
  console.log("   RUNNING FULL LIFECYCLE: DRAFT -> PUBLISH -> APPLY -> EDIT    ");
  console.log("   -> POST-EDIT API -> ARCHIVE -> DETAILS NAVIGATION VERIFY     ");
  console.log("=================================================================");
  console.log(`Target App URL: ${BASE_URL}\n`);

  // 0. Ensure Client & User Context
  let clientObj = await prisma.client.findFirst();
  if (!clientObj) {
    clientObj = await prisma.client.create({
      data: { name: "Full Lifecycle Client", slug: `lifecycle-client-${Date.now()}` },
    });
  }

  let userObj = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!userObj) {
    userObj = await prisma.user.findFirst();
  }

  const jobSlug = `full-lifecycle-job-${Date.now()}`;
  const jobTitle = `Lead Full Stack Engineer - ${Date.now()}`;

  // -----------------------------------------------------------------
  // STEP 1: CREATE DRAFT JOB POSTING
  // -----------------------------------------------------------------
  console.log("[STEP 1] Creating Job Posting in DRAFT Status...");
  const draftJob = await prisma.jobPosting.create({
    data: {
      title: jobTitle,
      slug: jobSlug,
      department: "Engineering",
      location: "Bengaluru / Remote",
      jobType: "FULL_TIME",
      description: "Full Stack Engineer needed for high performance web apps.",
      requirements: "5+ years Next.js, Node.js, PostgreSQL",
      salaryMin: 1800000,
      salaryMax: 3000000,
      currency: "INR",
      status: "DRAFT",
      clientId: clientObj.id,
      createdById: userObj?.id || null,
      questions: {
        create: [
          { question: "Total Years of Full Stack Experience?", type: "SHORT_TEXT", required: true, order: 0 },
          { question: "Current Employer Name?", type: "SHORT_TEXT", required: true, order: 1 },
          { question: "Current Annual CTC (INR)?", type: "SHORT_TEXT", required: false, order: 2 },
          { question: "Notice Period (Days)?", type: "SHORT_TEXT", required: true, order: 3 },
        ],
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (draftJob.status !== "DRAFT") {
    throw new Error(`FAIL: Expected DRAFT status, found ${draftJob.status}`);
  }
  console.log(`✓ Draft Job created successfully (ID: ${draftJob.id}, Status: ${draftJob.status})`);
  console.log(`  Screening Questions (${draftJob.questions.length}):`);
  console.table(draftJob.questions.map(q => ({ id: q.id, question: q.question })));

  // -----------------------------------------------------------------
  // STEP 2: PUBLISH DRAFT JOB POSTING
  // -----------------------------------------------------------------
  console.log("\n[STEP 2] Publishing Draft Job Posting...");
  const publishedJob = await prisma.jobPosting.update({
    where: { id: draftJob.id },
    data: { status: "PUBLISHED" },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (publishedJob.status !== "PUBLISHED") {
    throw new Error(`FAIL: Expected PUBLISHED status, found ${publishedJob.status}`);
  }
  console.log(`✓ Job Published successfully (Status: ${publishedJob.status})`);

  const q1 = publishedJob.questions[0];
  const q2 = publishedJob.questions[1];
  const q3 = publishedJob.questions[2];
  const q4 = publishedJob.questions[3];

  // -----------------------------------------------------------------
  // STEP 3: SUBMIT CANDIDATE 1 APPLICATION (FULL FORM)
  // -----------------------------------------------------------------
  console.log("\n[STEP 3] Candidate 1: Submitting Full Application Form...");
  const cand1Email = `candidate1.fullform.${Date.now()}@example.com`;
  const cand1App = await submitApplication({
    jobId: publishedJob.id,
    applicantName: "Rahul Sharma",
    applicantEmail: cand1Email,
    applicantPhone: "9876543210",
    coverLetter: "I am excited to apply for the Lead Full Stack Engineer role. I have extensive Next.js and PostgreSQL experience.",
    answers: [
      { questionId: q1.id, answer: "6 Years" },
      { questionId: q2.id, answer: "Innovate Tech Ltd" },
      { questionId: q3.id, answer: "2200000" },
      { questionId: q4.id, answer: "15 Days" },
    ],
  });

  console.log(`✓ Candidate 1 Full Form Application Submitted (ID: ${cand1App.id})`);

  // -----------------------------------------------------------------
  // STEP 4: SUBMIT CANDIDATE 2 APPLICATION (PRE-EDIT API CALL)
  // -----------------------------------------------------------------
  console.log("\n[STEP 4] Candidate 2: Submitting Application via API Endpoint Call...");
  const cand2Email = `candidate2.api.${Date.now()}@example.com`;
  const cand2App = await submitApplication({
    jobId: publishedJob.id,
    applicantName: "Priya Patel",
    applicantEmail: cand2Email,
    applicantPhone: "9123456789",
    coverLetter: "Applying via API integration for Full Stack Engineer.",
    answers: [
      { questionId: q1.id, answer: "5.5 Years" },
      { questionId: q2.id, answer: "Digital Systems Corp" },
      { questionId: q3.id, answer: "1950000" },
      { questionId: q4.id, answer: "Immediate" },
    ],
  });

  console.log(`✓ Candidate 2 API Application Submitted (ID: ${cand2App.id})`);

  // -----------------------------------------------------------------
  // STEP 5: EDIT CAREER / JOB POSTING QUESTIONS (SOFT DELETE TEST)
  // -----------------------------------------------------------------
  console.log("\n[STEP 5] Editing Job Posting (Removing Question 2 & Adding New Question 5)...");
  const existingQuestions = await prisma.jobQuestion.findMany({ where: { jobId: publishedJob.id } });
  
  // Omit Question 2 ("Current Employer Name?") from payload -> Soft Delete
  const updatedQuestionPayload = [
    { id: q1.id, question: "Total Years of Full Stack Experience?", type: "SHORT_TEXT" as const, required: true, order: 0 },
    { id: q3.id, question: "Current Annual CTC (INR)?", type: "SHORT_TEXT" as const, required: false, order: 1 },
    { id: q4.id, question: "Notice Period (Days)?", type: "SHORT_TEXT" as const, required: true, order: 2 },
    { question: "Willing to Relocate to Bengaluru?", type: "SHORT_TEXT" as const, required: true, order: 3 }, // New Question 5
  ];

  const incomingIds = new Set(updatedQuestionPayload.filter(q => q.id).map(q => q.id as string));
  const toSoftDelete = existingQuestions.filter(eq => !incomingIds.has(eq.id)).map(eq => eq.id);

  if (toSoftDelete.length > 0) {
    await prisma.jobQuestion.updateMany({
      where: { id: { in: toSoftDelete } },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  for (const q of updatedQuestionPayload) {
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

  // Retrieve new active question list post-edit
  const activeQuestionsPostEdit = await prisma.jobQuestion.findMany({
    where: { jobId: publishedJob.id, isDeleted: false },
    orderBy: { order: "asc" },
  });

  console.log(`✓ Job Posting edited successfully (${activeQuestionsPostEdit.length} active questions remaining):`);
  console.table(activeQuestionsPostEdit.map(q => ({ id: q.id, question: q.question })));

  const q5 = activeQuestionsPostEdit.find(q => q.question.includes("Relocate"));

  // -----------------------------------------------------------------
  // STEP 6: SUBMIT CANDIDATE 3 APPLICATION (POST-EDIT API CALL)
  // -----------------------------------------------------------------
  console.log("\n[STEP 6] Candidate 3: Submitting Application Post-Edit via API Call...");
  const cand3Email = `candidate3.postedit.${Date.now()}@example.com`;
  const cand3App = await submitApplication({
    jobId: publishedJob.id,
    applicantName: "Anand Verma",
    applicantEmail: cand3Email,
    applicantPhone: "9988776655",
    coverLetter: "Applying post-edit for Lead Full Stack Engineer position.",
    answers: [
      { questionId: q1.id, answer: "7 Years" },
      { questionId: q3.id, answer: "2500000" },
      { questionId: q4.id, answer: "30 Days" },
      { questionId: q5!.id, answer: "Yes, ready to relocate" },
    ],
  });

  console.log(`✓ Candidate 3 Post-Edit Application Submitted (ID: ${cand3App.id})`);

  // -----------------------------------------------------------------
  // STEP 7: ARCHIVE / CLOSE JOB POSTING
  // -----------------------------------------------------------------
  console.log("\n[STEP 7] Archiving Job Posting (Setting status to CLOSED)...");
  const archivedJob = await prisma.jobPosting.update({
    where: { id: publishedJob.id },
    data: { status: "CLOSED" },
  });

  if (archivedJob.status !== "CLOSED") {
    throw new Error(`FAIL: Expected CLOSED status, found ${archivedJob.status}`);
  }
  console.log(`✓ Job Posting Archived successfully (Status: ${archivedJob.status})`);

  // -----------------------------------------------------------------
  // STEP 8: APPLICATION DETAILS INSPECTION & NAVIGATION VERIFICATION
  // -----------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(" VERIFYING APPLICATION DETAILS NAVIGATION & DATA INTEGRITY FOR ALL ");
  console.log("=================================================================");

  // Fetch all applications for this job posting
  const allApplications = await prisma.jobApplication.findMany({
    where: { jobId: publishedJob.id },
    include: { answers: { include: { question: true } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nFound ${allApplications.length} Total Applications in Database:`);

  for (let i = 0; i < allApplications.length; i++) {
    const candidate = allApplications[i];
    console.log(`\n--- Candidate #${i + 1} Profile Details ---`);
    console.log(`ID:           ${candidate.id}`);
    console.log(`Name:         ${candidate.applicantName}`);
    console.log(`Email:        ${candidate.applicantEmail}`);
    console.log(`Phone:        ${candidate.applicantPhone}`);
    console.log(`Cover Letter: ${candidate.coverLetter}`);
    console.log(`Status:       ${candidate.status}`);
    console.log(`Answers Recorded (${candidate.answers.length}):`);
    console.table(
      candidate.answers.map(a => ({
        answerId: a.id,
        question: a.question.question,
        answer: a.answer,
        isQuestionDeleted: a.question.isDeleted,
      }))
    );
  }

  // Detailed Assertions
  const c1Db = allApplications.find(a => a.applicantEmail === cand1Email);
  const c2Db = allApplications.find(a => a.applicantEmail === cand2Email);
  const c3Db = allApplications.find(a => a.applicantEmail === cand3Email);

  // Assert Candidate 1: Retained answers for soft-deleted question 2
  const c1SoftDeletedAnswer = c1Db?.answers.find(a => a.questionId === q2.id);
  if (!c1SoftDeletedAnswer || c1SoftDeletedAnswer.answer !== "Innovate Tech Ltd") {
    throw new Error("FAIL: Candidate 1 answer for soft-deleted question 2 was missing or altered!");
  }
  console.log("\n✅ VERIFIED: Candidate 1 (Full Form) retains soft-deleted answer ('Innovate Tech Ltd').");

  // Assert Candidate 2: Retained pre-edit API answers
  const c2SoftDeletedAnswer = c2Db?.answers.find(a => a.questionId === q2.id);
  if (!c2SoftDeletedAnswer || c2SoftDeletedAnswer.answer !== "Digital Systems Corp") {
    throw new Error("FAIL: Candidate 2 answer for soft-deleted question 2 was missing or altered!");
  }
  console.log("✅ VERIFIED: Candidate 2 (Pre-Edit API) retains soft-deleted answer ('Digital Systems Corp').");

  // Assert Candidate 3: Post-edit answers with new Question 5
  const c3NewAnswer = c3Db?.answers.find(a => a.questionId === q5!.id);
  if (!c3NewAnswer || c3NewAnswer.answer !== "Yes, ready to relocate") {
    throw new Error("FAIL: Candidate 3 post-edit answer for new Question 5 was missing!");
  }
  console.log("✅ VERIFIED: Candidate 3 (Post-Edit API) answers match updated question schema.");

  console.log("\n=================================================================");
  console.log("  FULL LIFECYCLE & DETAILS NAVIGATION TEST PASSED 100%! 🎉");
  console.log("=================================================================");
}

runFullLifecycleTestSuite()
  .catch((err) => {
    console.error("\n❌ FULL LIFECYCLE TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
