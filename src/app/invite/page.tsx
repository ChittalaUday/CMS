import { redirect } from "next/navigation"
import { getInviteByCode } from "@/app/_actions/invites"
import { InviteCodeForm } from "./InviteCodeForm"

export const dynamic = "force-dynamic"

export default function InvitePage() {
  async function submitCode(formData: FormData) {
    "use server"
    const code = (formData.get("code") as string | null)?.replace("-", "").trim().toUpperCase()
    if (!code) return

    const invite = await getInviteByCode(code)
    if (!invite) return

    redirect(`/invite/${invite.token}`)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <InviteCodeForm submitCode={submitCode} />
      </div>
    </div>
  )
}
