import "dotenv/config"

const BASE_URL = "http://localhost:3010"
const JOB_ID = "cmqgoonpa00006dpdzzqx2zm9"

async function runTest() {
  console.log(`=== Testing submission to job: ${JOB_ID} ===`)

  // Define valid answers according to the questions list:
  // - cmqi3sq070005b8pdi1q5boex (Test question, SHORT_TEXT, required: true)
  // - cmqi3sq070006b8pdy3ukx2w0 (Q2, SINGLE_CHOICE, required: false)
  // - cmqi3sq070007b8pdush5ql3b (Resume, FILE, required: true)

  const payload = {
    jobId: JOB_ID,
    applicantName: "Public API Test Applicant",
    applicantEmail: `test-api-${Date.now()}@example.com`,
    applicantPhone: "+1234567890",
    resumeUrl: "https://example.com/resumes/public_api_test.pdf",
    coverLetter: "This is a test cover letter from the public API test script.",
    answers: [
      {
        questionId: "cmqi3sq070005b8pdi1q5boex",
        answer: "My Short Text Answer"
      },
      {
        questionId: "cmqi3sq070006b8pdy3ukx2w0",
        answer: "t2"
      },
      {
        questionId: "cmqi3sq070007b8pdush5ql3b",
        answer: "https://example.com/resumes/my_resume_file.pdf"
      }
    ]
  }

  console.log("Submitting with payload:", JSON.stringify(payload, null, 2))

  try {
    const res = await fetch(`${BASE_URL}/api/public/careers/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const body = await res.json()
    console.log("Response status:", res.status)
    console.log("Response body:", JSON.stringify(body, null, 2))
    
    if (res.status === 200 && body.success) {
      console.log("\nSUCCESS: Public API application submission successful!")
    } else {
      console.error("\nFAILURE: Public API application submission failed.")
    }
  } catch (err: any) {
    console.error("Error during request execution:", err.message)
  }
}

runTest()
