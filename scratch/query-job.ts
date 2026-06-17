import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function queryJob() {
  const jobId = "cmqi4nh380000topd2b752c1w"
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      questions: true
    }
  })
  console.log("Job posting details:", JSON.stringify(job, null, 2))
}

queryJob()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
