import { prisma } from "@/lib/db/prisma"
import { revalidatePath } from "next/cache"
import { QueueStatus } from "@/generated/prisma/enums"
import { atsQueue, keywordQueue } from "./queue-manager"
import { queueEvents, activeAtsTaskIds, activeKeywordTaskIds } from "./queue-events"
import { generateText, computeSemanticSimilarity } from "@/lib/ai/ai"

// Auto-healing and queue recovery loader
export async function initializeQueues() {
  console.log("[Queue] Scanning database for pending tasks...")

  // Auto-healing: Reset any jobs stuck in 'PROCESSING' for more than 5 minutes back to 'PENDING'
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  
  const healedApps = await prisma.jobApplication.updateMany({
    where: {
      atsStatus: QueueStatus.PROCESSING,
      updatedAt: { lt: fiveMinutesAgo }
    },
    data: {
      atsStatus: QueueStatus.PENDING,
      atsJustification: "Queue Auto-Healed: Resetting stuck processing state."
    }
  })

  const healedJobs = await prisma.jobPosting.updateMany({
    where: {
      keywordStatus: QueueStatus.PROCESSING,
      updatedAt: { lt: fiveMinutesAgo }
    },
    data: {
      keywordStatus: QueueStatus.PENDING
    }
  })

  if (healedApps.count > 0 || healedJobs.count > 0) {
    queueEvents.emit("change")
  }

  // 1. Recover pending ATS Scorers
  const pendingApps = await prisma.jobApplication.findMany({
    where: { atsStatus: QueueStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  })
  
  let appsQueued = 0
  for (const app of pendingApps) {
    if (!activeAtsTaskIds.has(app.id)) {
      enqueueAtsScorer(app.id)
      appsQueued++
    }
  }

  // 2. Recover pending Job Keyword extractions
  let pendingJobs = await prisma.jobPosting.findMany({
    where: { keywordStatus: QueueStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  })

  // If there are no pending jobs, auto-heal IDLE jobs to PENDING
  if (pendingJobs.length === 0) {
    const idleJobs = await prisma.jobPosting.findMany({
      where: { keywordStatus: QueueStatus.IDLE },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    })

    if (idleJobs.length > 0) {
      console.log(`[Queue] Auto-healing ${idleJobs.length} IDLE jobs to PENDING for keyword extraction.`)
      await prisma.jobPosting.updateMany({
        where: { id: { in: idleJobs.map(j => j.id) } },
        data: { keywordStatus: QueueStatus.PENDING }
      })

      // Reload pending jobs
      pendingJobs = await prisma.jobPosting.findMany({
        where: { keywordStatus: QueueStatus.PENDING },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      })
    }
  }

  let jobsQueued = 0
  for (const job of pendingJobs) {
    if (!activeKeywordTaskIds.has(job.id)) {
      enqueueKeywordGeneration(job.id)
      jobsQueued++
    }
  }

  if (appsQueued > 0 || jobsQueued > 0) {
    console.log(`[Queue] Loaded ${appsQueued} new pending applications, ${jobsQueued} new pending jobs into active queues.`)
    queueEvents.emit("change")
  }
}

// Handler functions for processing individual items
export async function processAtsApplication(applicationId: string, model?: string) {
  // Update status to PROCESSING
  await prisma.jobApplication.update({
    where: { id: applicationId },
    data: { atsStatus: QueueStatus.PROCESSING }
  })
  queueEvents.emit("change")
  
  let jobId: string | null = null;
  try {
    const app = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { jobId: true }
    })
    jobId = app?.jobId || null
 
    const scoreResult = await calculateAtsScoreInternal(applicationId, model)
    
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        atsStatus: QueueStatus.COMPLETED,
        atsScore: scoreResult.score,
        atsConfidence: scoreResult.confidence,
        atsJustification: scoreResult.justification,
        extractedSkills: scoreResult.skills,
        extractedExperience: scoreResult.experience,
        extractedLocation: scoreResult.location,
        extractedEducation: scoreResult.education
      }
    })
  } catch (err: any) {
    console.error(`ATS queue processing failed for ${applicationId}:`, err)
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        atsStatus: QueueStatus.FAILED,
        atsJustification: err.message || "Failed to analyze application"
      }
    })
  }

  // Revalidate cache paths
  revalidatePath("/dashboard/careers/queue")
  if (jobId) {
    revalidatePath(`/dashboard/careers/${jobId}/applications`)
  }
  queueEvents.emit("change")
}

export async function processJobKeywords(jobId: string) {
  // Update status to PROCESSING
  await prisma.jobPosting.update({
    where: { id: jobId },
    data: { keywordStatus: QueueStatus.PROCESSING }
  })
  queueEvents.emit("change")
  
  try {
    await extractJobKeywordsInternal(jobId)
    
    await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        keywordStatus: QueueStatus.COMPLETED
      }
    })
  } catch (err: any) {
    console.error(`Keyword queue processing failed for ${jobId}:`, err)
    await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        keywordStatus: QueueStatus.FAILED
      }
    })
  }

  // Revalidate cache paths
  revalidatePath("/dashboard/careers/queue")
  revalidatePath("/dashboard/careers")
  queueEvents.emit("change")
}

// Queue Enqueuers (Deduplicated execution wrappers)
export function enqueueAtsScorer(applicationId: string, model?: string) {
  if (activeAtsTaskIds.has(applicationId)) return
  activeAtsTaskIds.add(applicationId)
  queueEvents.emit("change")

  atsQueue.add(async () => {
    try {
      await processAtsApplication(applicationId, model)
    } finally {
      activeAtsTaskIds.delete(applicationId)
      queueEvents.emit("change")
    }
  })
}

export function enqueueKeywordGeneration(jobId: string) {
  if (activeKeywordTaskIds.has(jobId)) return
  activeKeywordTaskIds.add(jobId)
  queueEvents.emit("change")

  keywordQueue.add(async () => {
    try {
      await processJobKeywords(jobId)
    } finally {
      activeKeywordTaskIds.delete(jobId)
      queueEvents.emit("change")
    }
  })
}

// Backward compatibility layers
export async function processQueue() {
  await initializeQueues()
}

export async function processKeywordQueue() {
  await initializeQueues()
}

export async function generateJobKeywords(jobId: string) {
  // Set the job status to PENDING
  await prisma.jobPosting.update({
    where: { id: jobId },
    data: { keywordStatus: QueueStatus.PENDING }
  })
  queueEvents.emit("change")
  
  enqueueKeywordGeneration(jobId)
}

export async function extractJobKeywordsInternal(jobId: string) {
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: { questions: true }
  })

  if (!job) throw new Error("Job posting not found.")

  const prompt = `You are an expert recruiter and technical analyst.
Extract a list of 10 to 15 key technical skills, tools, frameworks, programming languages, and competencies required for this job posting.
Combine details from the job title, description, requirements, responsibilities, and screening questions.

Job Title: ${job.title}
Department: ${job.department}
Description: ${job.description.replace(/<[^>]*>/g, "")}
Requirements: ${(job.requirements || "").replace(/<[^>]*>/g, "")}
Responsibilities: ${(job.responsibilities || "").replace(/<[^>]*>/g, "")}
Questions: ${job.questions.map(q => q.question).join(", ")}

Respond with ONLY a comma-separated list of the extracted keywords (e.g. "React, Node.js, TypeScript, PostgreSQL, Docker, AWS"). Do not include any introductory or concluding text. Keep keywords simple.
`.trim()

  const text = await generateText({ prompt })
  const keywords = text
    .split(",")
    .map((k: string) => k.trim())
    .filter((k: string) => k.length > 0 && k.length < 30) // Sanity check

  await prisma.jobPosting.update({
    where: { id: jobId },
    data: { keywords }
  })

  return keywords
}

export async function calculateAtsScoreInternal(applicationId: string, model?: string) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          title: true,
          description: true,
          requirements: true,
          responsibilities: true,
          keywords: true,

        },
      },
      answers: {
        include: {
          question: true,
        },
      },
    },
  })

  if (!application) throw new Error("Application not found.")

  let resumeText = ""
  if (application.resumeUrl) {
    try {
      const pdfRes = await fetch(application.resumeUrl)
      if (pdfRes.ok) {
        const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer())
        const { extractText } = await import("unpdf")
        const parsed = await extractText(pdfBuffer)
        const textVal = parsed.text
        resumeText = Array.isArray(textVal) ? textVal.join("\n") : (textVal || "")
      }
    } catch (pdfErr) {
      console.error("Failed to parse PDF resume with unpdf in queue:", pdfErr)
      resumeText = "Could not parse PDF file text."
    }
  }

  const jobInfo = `
Job Title: ${application.job.title}
Job Description: ${application.job.description.replace(/<[^>]*>/g, "")}
Job Requirements: ${(application.job.requirements || "").replace(/<[^>]*>/g, "")}
Job Responsibilities: ${(application.job.responsibilities || "").replace(/<[^>]*>/g, "")}
`.trim()

  const candidateInfo = `
Candidate Name: ${application.applicantName}
Cover Letter: ${application.coverLetter || "None"}
Questionnaire Answers:
${application.answers.map((a) => `- Q: ${a.question.question}\n  A: ${a.answer}`).join("\n")}
Resume Content (Parsed PDF):
${resumeText ? resumeText.substring(0, 6000) : "No resume text extracted."}
`.trim()

  // Build keyword context + semantic similarity (run in parallel)
  const jdSkills = application.job.keywords || []
  const candidateText = `${application.applicantName} ${application.coverLetter || ""} ${application.answers.map(a => a.answer).join(" ")} ${resumeText}`
  const candidateTextLower = candidateText.toLowerCase()

  const matchedSkills = jdSkills.filter(skill => {
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i")
    return regex.test(candidateTextLower)
  })
  const missingSkills = jdSkills.filter(s => !matchedSkills.includes(s))

  // Semantic similarity using the embedding model (runs in parallel, gracefully degrades)
  const semanticResult = await computeSemanticSimilarity(
    jobInfo,
    `${candidateInfo}\n${resumeText.substring(0, 3000)}`,
  )
  const semanticScore = semanticResult.score  // 0–100, -1 if embedding unavailable
  const semanticLine  = semanticScore >= 0
    ? `Semantic Similarity (${semanticResult.model}): ${semanticScore}% — use this as an additional signal for your Confidence score.`
    : `Semantic Similarity: unavailable (embedding model offline).`

  const prompt = `You are an expert technical recruiter evaluating a job application.
Carefully read the job requirements and the candidate's resume, then provide an honest, balanced compatibility assessment.

=== JOB INFO ===
${jobInfo}

=== CANDIDATE INFO ===
${candidateInfo}

=== KEYWORD HINTS (pre-matched from resume text) ===
Matched Keywords: ${matchedSkills.length > 0 ? matchedSkills.join(", ") : "None found"}
Missing Keywords: ${missingSkills.length > 0 ? missingSkills.join(", ") : "None"}

=== SEMANTIC ANALYSIS ===
${semanticLine}

=== INSTRUCTIONS ===
1. Base your Score on how well the candidate's actual experience, skills, and background fit the job requirements.
2. Use the Semantic Similarity score to inform your Confidence (high similarity = high confidence in your assessment).
3. If the resume is clearly unrelated to the job, Score should be 0–15.
4. If the candidate has partial relevant skills, Score should reflect the real degree of fit (e.g. 30–60).
5. Only give 70+ if the candidate genuinely meets most of the job requirements.
6. Write a natural 2–3 sentence justification as if briefing the hiring manager. Do not mention numeric scores or keyword counts.

=== OUTPUT FORMAT ===
Respond ONLY in this exact format with no extra text before or after:
Score: [0-100]
Confidence: [0-100]
Justification: [2-3 natural sentences for the hiring manager]
Skills: [comma-separated skills found in candidate profile]
Experience: [total years as integer, 0 if unknown]
Location: [city/region or Unknown]
Education: [highest degree or Unknown]`.trim()

  const rawText = await generateText({ prompt, model })

  // Strip out model thinking tokens (e.g. <think>...</think> from qwen3)
  const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()

  const scoreMatch     = text.match(/Score:\s*(\d+)/i)
  const confidenceMatch = text.match(/Confidence:\s*(\d+)/i)
  const justMatch      = text.match(/Justification:\s*([\s\S]*?)(?:\n(?:Skills|Experience|Location|Education):|$)/i)
  const skillsMatch    = text.match(/Skills:\s*([^\n]+)/i)
  const expMatch       = text.match(/Experience:\s*(\d+)/i)
  const locMatch       = text.match(/Location:\s*([^\n]+)/i)
  const eduMatch       = text.match(/Education:\s*([^\n]+)/i)

  const score       = scoreMatch      ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))      : 0
  const confidence  = confidenceMatch ? Math.min(100, Math.max(0, parseInt(confidenceMatch[1], 10))) : 50
  const justification = justMatch ? justMatch[1].trim() : "Could not extract AI justification — please re-run the analysis."

  const parsedSkills = skillsMatch
    ? skillsMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
    : matchedSkills

  const experience = expMatch ? parseInt(expMatch[1], 10) : 0
  const location   = locMatch ? locMatch[1].trim() : null
  const education  = eduMatch ? eduMatch[1].trim() : null

  return {
    score,
    confidence,
    justification,
    skills: parsedSkills,
    experience,
    location: !location || location === "Unknown" ? null : location,
    education: !education || education === "Unknown" ? null : education,
  }
}

// Automatically kick off queues when module loaded (except during Next.js builds)
if (process.env.NEXT_PHASE !== "phase-production-build") {
  initializeQueues().catch(err => console.error("Failed to automatically boot queues:", err))
}
