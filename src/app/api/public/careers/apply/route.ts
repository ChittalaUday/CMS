import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-auth"
import { checkRateLimit, getAllowedOrigins, resolveOrigin } from "@/lib/rate-limit"
import { submitApplication } from "@/app/dashboard/careers/actions"
import logger from "@/lib/logger"

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 })
  }
  if (!auth.scopes.includes("write:applications")) {
    return NextResponse.json({ error: "Insufficient scope" }, { status: 403 })
  }

  const rl = await checkRateLimit(auth.clientId)
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
      let uploadedFile = (formData.get("resume") as File) || (formData.get("resumeFile") as File)
      let fileQuestionIdForUpload = fileQuestions[0]?.id

      for (const q of fileQuestions) {
        const fileFromForm = formData.get(q.id) as File
        if (fileFromForm && fileFromForm.size > 0) {
          uploadedFile = fileFromForm
          fileQuestionIdForUpload = q.id
          break
        }
      }

      if (uploadedFile && uploadedFile.size > 0) {
        // 10 MB limit on resume uploads via the public API
        if (uploadedFile.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: "Resume file must be under 10 MB" }, { status: 400 })
        }
        const { UTApi } = await import("uploadthing/server")
        const utapi = new UTApi()
        const uploadResponse = await utapi.uploadFiles(uploadedFile)
        if (uploadResponse.data) {
          resumeUrl = uploadResponse.data.url
          if (fileQuestionIdForUpload) {
            answers = answers.filter((a) => a.questionId !== fileQuestionIdForUpload)
            answers.push({ questionId: fileQuestionIdForUpload, answer: resumeUrl })
          }
        } else if (uploadResponse.error) {
          logger.error({ err: uploadResponse.error }, "api/public/careers/apply resume upload failed")
          return NextResponse.json({ error: "Failed to upload resume" }, { status: 500 })
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

    return new NextResponse(JSON.stringify({ success: true, application }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
    })
  } catch (err) {
    logger.error({ err }, "api/public/careers/apply POST failed")
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 })
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
