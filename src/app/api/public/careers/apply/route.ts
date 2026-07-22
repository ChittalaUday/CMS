import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { validateApiKey } from "@/lib/auth/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/utils/rate-limit"
import { submitApplication } from "@/app/dashboard/careers/actions"
import { uploadViaR2 } from "@/lib/upload"
import logger from "@/lib/utils/logger"

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 })
  }
  if (!auth.scopes.includes("write:applications")) {
    return NextResponse.json({ error: "Insufficient scope" }, { status: 403 })
  }

  const rl = await checkRateLimit(auth.clientId, request)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    )
  }

  try {
    const contentType = request.headers.get("content-type") ?? ""
    let bodyData: {
      jobId?: string
      applicantName?: string
      applicantEmail?: string
      applicantPhone?: string
      resumeUrl?: string
      coverLetter?: string
      answers?: { questionId: string; answer: string }[]
    } = {}

    if (contentType.includes("multipart/form-data")) {
      let formData
      try {
        formData = await request.formData()
      } catch {
        return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 })
      }

      const jobId = formData.get("jobId") as string
      const applicantName = formData.get("applicantName") as string
      const applicantEmail = formData.get("applicantEmail") as string
      const applicantPhone = (formData.get("applicantPhone") as string) || undefined
      const coverLetter = (formData.get("coverLetter") as string) || undefined

      let answers: { questionId: string; answer: string }[] = []
      const answersStr = formData.get("answers") as string
      if (answersStr) {
        try { answers = JSON.parse(answersStr) } catch { /* ignore */ }
      }
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("answer_")) {
          answers.push({ questionId: key.replace("answer_", ""), answer: value as string })
        }
      }

      let resumeUrl = (formData.get("resumeUrl") as string) || undefined

      const job = await prisma.jobPosting.findFirst({
        where: { id: jobId, clientId: auth.clientId },
        include: { questions: true },
      })
      if (!job) {
        return NextResponse.json({ error: "Job posting not found" }, { status: 404 })
      }

      const fileQuestions = job.questions.filter((q) => q.type === "FILE")
      let isResumeField = true
      let uploadedFile = (formData.get("resume") as File) || (formData.get("resumeFile") as File)
      let fileQuestionIdForUpload = fileQuestions[0]?.id

      for (const q of fileQuestions) {
        const fileFromForm = formData.get(q.id) as File
        if (fileFromForm && fileFromForm.size > 0) {
          uploadedFile = fileFromForm
          fileQuestionIdForUpload = q.id
          isResumeField = false
          break
        }
      }

      if (uploadedFile && uploadedFile.size > 0) {
        try {
          const uploaded = await uploadViaR2(uploadedFile, { isResume: isResumeField })
          resumeUrl = uploaded.url
          if (fileQuestionIdForUpload) {
            answers = answers.filter((a) => a.questionId !== fileQuestionIdForUpload)
            answers.push({ questionId: fileQuestionIdForUpload, answer: resumeUrl })
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to upload resume"
          const status = msg.includes("not allowed") || msg.includes("exceeds") ? 400 : 500
          logger.error({ err }, "api/public/careers/apply resume upload failed")
          return NextResponse.json({ error: msg }, { status })
        }
      }

      bodyData = { jobId, applicantName, applicantEmail, applicantPhone, resumeUrl, coverLetter, answers }
    } else {
      bodyData = await request.json().catch(() => ({}))

      if (bodyData.jobId) {
        const job = await prisma.jobPosting.findFirst({
          where: { id: bodyData.jobId, clientId: auth.clientId },
          select: { id: true },
        })
        if (!job) {
          return NextResponse.json({ error: "Job posting not found" }, { status: 404 })
        }
      }
    }

    const { jobId, applicantName, applicantEmail, applicantPhone, resumeUrl, coverLetter, answers } = bodyData

    if (!jobId || !applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: "jobId, applicantName, and applicantEmail are required" },
        { status: 400 }
      )
    }

    const application = await submitApplication({
      jobId,
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeUrl,
      coverLetter,
      answers: answers ?? [],
    })

    const allowedOrigins = await getAllowedOrigins(auth.clientId)
    const origin = resolveOrigin(request.headers.get("origin"), allowedOrigins)

    return new NextResponse(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  } catch (err) {
    logger.error({ err }, "api/public/careers/apply POST failed")
    const message = err instanceof Error ? err.message : "Failed to submit application"
    const isClientError = err instanceof Error && (
      err.message.includes("no longer exists") ||
      err.message.includes("no longer accepting") ||
      err.message.includes("deadline") ||
      err.message.includes("already applied") ||
      err.message.includes("required") ||
      err.message.includes("Malicious") ||
      err.message.includes("not allowed") ||
      err.message.includes("exceeds")
    )
    return NextResponse.json({ error: message }, { status: isClientError ? 400 : 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*"
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  })
}
