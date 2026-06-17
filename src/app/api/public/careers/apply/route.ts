import { NextRequest, NextResponse } from "next/server"
import { submitApplication } from "@/app/dashboard/careers/actions"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    let bodyData: any = {}

    if (contentType.includes("multipart/form-data")) {
      let formData
      try {
        formData = await request.formData()
      } catch (parseErr: any) {
        if (!contentType.includes("boundary")) {
          throw new Error("Failed to parse body as FormData. Please make sure the 'Content-Type' header is NOT manually checked/set in your Postman request headers. Disable it so Postman automatically appends the correct multipart boundary.")
        }
        throw new Error(`Failed to parse body as FormData: ${parseErr.message}`)
      }
      
      const jobId = formData.get("jobId") as string
      const applicantName = formData.get("applicantName") as string
      const applicantEmail = formData.get("applicantEmail") as string
      const applicantPhone = formData.get("applicantPhone") as string || undefined
      const coverLetter = formData.get("coverLetter") as string || undefined
      
      let answers: { questionId: string; answer: string }[] = []
      
      // Support parsed JSON answers field
      const answersStr = formData.get("answers") as string
      if (answersStr) {
        try {
          answers = JSON.parse(answersStr)
        } catch (e) {
          // ignore parsing error
        }
      }

      // Support field format answer_[questionId]
      for (const [key, value] of formData.entries()) {
        if (key.startsWith("answer_")) {
          const questionId = key.replace("answer_", "")
          answers.push({
            questionId,
            answer: value as string,
          })
        }
      }

      // Upload resume to UploadThing server-side if provided
      let resumeUrl = formData.get("resumeUrl") as string || undefined
      
      // Fetch job questions to match FILE uploads to the correct questionnaire question ID
      const { prisma } = await import("@/lib/prisma")
      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: { questions: true }
      })

      const fileQuestions = job?.questions.filter(q => q.type === "FILE") || []
      
      // Check standard fields 'resume' or 'resumeFile'
      let uploadedFile = formData.get("resume") as File || formData.get("resumeFile") as File
      let fileQuestionIdForUpload = fileQuestions[0]?.id

      // Also support uploading directly using the question ID as form-data key
      for (const q of fileQuestions) {
        const fileFromForm = formData.get(q.id) as File
        if (fileFromForm && fileFromForm.size > 0) {
          uploadedFile = fileFromForm
          fileQuestionIdForUpload = q.id
          break
        }
      }

      if (uploadedFile && uploadedFile.size > 0) {
        const { UTApi } = await import("uploadthing/server")
        const utapi = new UTApi()
        const uploadResponse = await utapi.uploadFiles(uploadedFile)

        if (uploadResponse.data) {
          resumeUrl = uploadResponse.data.url
          // Map uploaded URL to the question's answer
          if (fileQuestionIdForUpload) {
            answers = answers.filter(a => a.questionId !== fileQuestionIdForUpload)
            answers.push({
              questionId: fileQuestionIdForUpload,
              answer: resumeUrl
            })
          }
        } else if (uploadResponse.error) {
          throw new Error(`Failed to upload resume file: ${uploadResponse.error.message}`)
        }
      }

      bodyData = {
        jobId,
        applicantName,
        applicantEmail,
        applicantPhone,
        resumeUrl,
        coverLetter,
        answers,
      }
    } else {
      bodyData = await request.json().catch(() => ({}))
    }

    const {
      jobId,
      applicantName,
      applicantEmail,
      applicantPhone,
      resumeUrl,
      coverLetter,
      answers,
    } = bodyData

    if (!jobId || !applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: "jobId, applicantName, and applicantEmail are required fields" },
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
      answers: answers || [],
    })

    return NextResponse.json({ success: true, application })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit application" },
      { status: 400 }
    )
  }
}
