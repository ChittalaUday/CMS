import { prisma } from "../../src/lib/db/prisma";
import { submitApplication } from "../../src/app/dashboard/careers/actions";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://udaychittala@localhost:5432/cms?schema=public";

async function runCareersUnitTestSuite() {
  console.log("=================================================");
  console.log("       RUNNING CAREERS UNIT & ACTIONS SUITE       ");
  console.log("=================================================");

  // 1. Ensure local client & user exist
  let clientObj = await prisma.client.findFirst();
  if (!clientObj) {
    clientObj = await prisma.client.create({
      data: { name: "Test Client", slug: `test-client-${Date.now()}` },
    });
  }

  let userObj = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!userObj) {
    userObj = await prisma.user.findFirst();
  }

  const testTitle = `QA Engineer - Careers Suite ${Date.now()}`;

  // 2. Create Job Posting with Questions
  console.log("\n[TEST 1] Creating Job Posting with Screening Questions...");
  const job = await prisma.jobPosting.create({
    data: {
      title: testTitle,
      slug: `qa-engineer-test-${Date.now()}`,
      department: "Engineering",
      location: "Remote",
      jobType: "FULL_TIME",
      description: "Test Job Description for Careers Suite.",
      status: "PUBLISHED",
      clientId: clientObj.id,
      createdById: userObj?.id || null,
      questions: {
        create: [
          {
            question: "Years of Automation Testing Experience?",
            type: "SHORT_TEXT",
            required: true,
            order: 0,
          },
          {
            question: "Preferred Framework (Selenium / Playwright)?",
            type: "SINGLE_CHOICE",
            required: true,
            order: 1,
            options: ["Selenium", "Playwright", "Cypress"],
          },
          {
            question: "Expected Salary (LPA)?",
            type: "SHORT_TEXT",
            required: false,
            order: 2,
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  console.log(`✓ Job Posting created (ID: ${job.id})`);
  console.table(
    job.questions.map((q) => ({
      id: q.id,
      question: q.question,
      isDeleted: q.isDeleted,
    }))
  );

  const q1 = job.questions[0];
  const q2 = job.questions[1];
  const q3 = job.questions[2];

  // 3. Candidate Application Submission
  console.log("\n[TEST 2] Submitting Candidate Application with Answers...");
  const app = await submitApplication({
    jobId: job.id,
    applicantName: "Automation QA Candidate",
    applicantEmail: `qa.candidate.${Date.now()}@example.com`,
    applicantPhone: "9998887770",
    answers: [
      { questionId: q1.id, answer: "5 Years" },
      { questionId: q2.id, answer: "Selenium" },
      { questionId: q3.id, answer: "12 LPA" },
    ],
  });

  console.log(`✓ Application submitted (ID: ${app.id})`);

  const answersBeforeEdit = await prisma.jobAnswer.findMany({
    where: { applicationId: app.id },
    include: { question: true },
  });
  console.table(
    answersBeforeEdit.map((a) => ({
      id: a.id,
      question: a.question.question,
      answer: a.answer,
      qDeleted: a.question.isDeleted,
    }))
  );

  // 4. Job Posting Question Update & Soft Delete Test
  console.log("\n[TEST 3] Updating Job Questions (Editing & Soft-Deleting)...");
  const existingQuestions = await prisma.jobQuestion.findMany({
    where: { jobId: job.id },
  });
  const incomingQuestions = [
    {
      id: q1.id,
      question: "Years of Automation Testing Experience?",
      type: "SHORT_TEXT" as const,
      required: true,
      order: 0,
    },
    {
      id: q3.id,
      question: "Expected Salary (LPA)?",
      type: "SHORT_TEXT" as const,
      required: false,
      order: 1,
    },
    {
      question: "Notice Period?",
      type: "SHORT_TEXT" as const,
      required: true,
      order: 2,
    },
  ];

  const incomingIds = new Set(
    incomingQuestions.filter((q) => q.id).map((q) => q.id as string)
  );
  const toSoftDelete = existingQuestions
    .filter((eq) => !incomingIds.has(eq.id))
    .map((eq) => eq.id);

  if (toSoftDelete.length > 0) {
    await prisma.jobQuestion.updateMany({
      where: { id: { in: toSoftDelete } },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  for (const q of incomingQuestions) {
    if (q.id && existingQuestions.some((eq) => eq.id === q.id)) {
      await prisma.jobQuestion.update({
        where: { id: q.id },
        data: {
          question: q.question,
          type: q.type,
          required: q.required,
          order: q.order,
          isDeleted: false,
          deletedAt: null,
        },
      });
    } else {
      await prisma.jobQuestion.create({
        data: {
          jobId: job.id,
          question: q.question,
          type: q.type,
          required: q.required,
          order: q.order,
          isDeleted: false,
        },
      });
    }
  }

  // 5. Verification Phase
  console.log("\n==========================================");
  console.log("VERIFYING CAREERS ACTIONS RESULTS");
  console.log("==========================================");

  const allDbQuestions = await prisma.jobQuestion.findMany({
    where: { jobId: job.id },
    orderBy: { order: "asc" },
  });
  console.log(`\n1. Database JobQuestion records (${allDbQuestions.length} rows):`);
  console.table(
    allDbQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      isDeleted: q.isDeleted,
      deletedAt: q.deletedAt,
    }))
  );

  const answersAfterEdit = await prisma.jobAnswer.findMany({
    where: { applicationId: app.id },
    include: { question: true },
  });
  console.log(
    `\n2. Candidate JobAnswers in DB after edit (${answersAfterEdit.length} answers preserved):`
  );
  console.table(
    answersAfterEdit.map((a) => ({
      answerId: a.id,
      questionText: a.question.question,
      candidateAnswer: a.answer,
      isQuestionDeleted: a.question.isDeleted,
    }))
  );

  const activeQuestions = await prisma.jobQuestion.findMany({
    where: { jobId: job.id, isDeleted: false },
    orderBy: { order: "asc" },
  });
  console.log(
    `\n3. Active questions returned for public candidate form (${activeQuestions.length} active questions):`
  );
  console.table(activeQuestions.map((q) => ({ id: q.id, question: q.question })));

  const q2Db = allDbQuestions.find((q) => q.id === q2.id);
  if (q2Db && q2Db.isDeleted === true && q2Db.deletedAt !== null) {
    console.log(
      "\n✅ PASS: Soft-deleted question marked correctly (isDeleted=true)."
    );
  } else {
    throw new Error("FAIL: Question was not soft-deleted properly.");
  }

  if (answersAfterEdit.length === 3) {
    console.log(
      "✅ PASS: Candidate answers remain 100% preserved in database."
    );
  } else {
    throw new Error(
      `FAIL: Expected 3 preserved candidate answers, found ${answersAfterEdit.length}.`
    );
  }

  console.log("\n==========================================");
  console.log("CAREERS ACTIONS UNIT TEST SUITE PASSED! 🎉");
  console.log("==========================================");
}

runCareersUnitTestSuite()
  .catch((err) => {
    console.error("\n❌ CAREERS UNIT TEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
