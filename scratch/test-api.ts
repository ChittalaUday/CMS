import "dotenv/config"
import { prisma } from "../src/lib/prisma"

const BASE_URL = "http://localhost:3010"

async function runTest() {
  console.log("=== Starting Live API validation tests ===")

  // Find a user to assign job posting to
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error("No user found in the database. Please run seed script first.")
    process.exit(1)
  }

  // 1. Create a job posting with a required question
  console.log("Creating test job posting with a required question...")
  const job = await prisma.jobPosting.create({
    data: {
      title: "Test Software Engineer " + Date.now(),
      slug: "test-software-engineer-" + Date.now(),
      department: "Engineering",
      location: "Remote",
      jobType: "FULL_TIME",
      description: "This is a test job description",
      status: "PUBLISHED",
      createdById: user.id,
      questions: {
        create: [
          {
            question: "What is your years of experience?",
            type: "SHORT_TEXT",
            required: true,
            order: 1,
          },
          {
            question: "Do you have experience with React?",
            type: "YES_NO",
            required: false,
            order: 2,
          }
        ]
      }
    },
    include: {
      questions: true
    }
  })

  const requiredQuestion = job.questions.find(q => q.required)!
  const optionalQuestion = job.questions.find(q => !q.required)!

  console.log(`Job posting created successfully: ${job.title} (ID: ${job.id})`)

  // 2. Test submitting WITHOUT the required question answered
  console.log("\n--- Test Case 1: Submitting application WITHOUT the required question ---")
  try {
    const res = await fetch(`${BASE_URL}/api/public/careers/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        applicantName: "Test Applicant",
        applicantEmail: "missing-req-" + Date.now() + "@example.com",
        answers: [
          {
            questionId: optionalQuestion.id,
            answer: "Yes"
          }
        ]
      })
    })

    const body = await res.json()
    if (res.status === 400 && body.error.includes("is required")) {
      console.log("PASS: Validation correctly blocked submission. Status:", res.status, "Error message:", body.error)
    } else {
      console.error("FAIL: Expected status 400 with validation error, got:", res.status, body)
    }
  } catch (err: any) {
    console.error("FAIL: Request failed:", err.message)
  }

  // 3. Test submitting WITH required question but EMPTY string answer
  console.log("\n--- Test Case 2: Submitting application with empty required answer ---")
  try {
    const res = await fetch(`${BASE_URL}/api/public/careers/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        applicantName: "Test Applicant",
        applicantEmail: "empty-req-" + Date.now() + "@example.com",
        answers: [
          {
            questionId: requiredQuestion.id,
            answer: "   " // empty spaces
          }
        ]
      })
    })

    const body = await res.json()
    if (res.status === 400 && body.error.includes("is required")) {
      console.log("PASS: Validation correctly blocked empty answer. Status:", res.status, "Error message:", body.error)
    } else {
      console.error("FAIL: Expected status 400 with validation error, got:", res.status, body)
    }
  } catch (err: any) {
    console.error("FAIL: Request failed:", err.message)
  }

  // 4. Test submitting WITH all required questions correctly answered
  console.log("\n--- Test Case 3: Submitting application WITH required question answered ---")
  try {
    const email = "success-" + Date.now() + "@example.com"
    const res = await fetch(`${BASE_URL}/api/public/careers/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        applicantName: "Successful Applicant",
        applicantEmail: email,
        answers: [
          {
            questionId: requiredQuestion.id,
            answer: "5 years"
          }
        ]
      })
    })

    const body = await res.json()
    if (res.status === 200 && body.success) {
      console.log("PASS: Application submitted successfully! Status:", res.status, "Application ID:", body.application.id)
    } else {
      console.error("FAIL: Submission failed. Status:", res.status, body)
    }
  } catch (err: any) {
    console.error("FAIL: Request failed:", err.message)
  }

  // 5. Clean up database
  console.log("\nCleaning up test data...")
  await prisma.jobAnswer.deleteMany({
    where: {
      questionId: {
        in: job.questions.map(q => q.id)
      }
    }
  })
  await prisma.jobApplication.deleteMany({
    where: {
      jobId: job.id
    }
  })
  await prisma.jobQuestion.deleteMany({
    where: {
      jobId: job.id
    }
  })
  await prisma.jobPosting.delete({
    where: {
      id: job.id
    }
  })
  console.log("Clean up completed successfully.")
  console.log("\n=== All Tests Finished ===")
}

runTest()
  .catch((err) => {
    console.error("Unhandled test error:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
