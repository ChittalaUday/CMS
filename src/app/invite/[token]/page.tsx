import { getInviteByToken } from "@/app/_actions/invites"
import { getInviteStatus } from "@/lib/auth/invite-utils"
import { notFound } from "next/navigation"
import { InviteSetupForm } from "./InviteSetupForm"
import { GalleryVerticalEndIcon, CheckCircle2Icon, ClockIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InviteTokenPage({ params }: PageProps) {
  const { token } = await params
  const invite = await getInviteByToken(token)

  if (!invite) notFound()

  const status = getInviteStatus(invite)

  if (status === "accepted") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto">
            <CheckCircle2Icon className="size-6 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold">Invite already used</h1>
          <p className="text-sm text-muted-foreground">
            This invite link has already been accepted. Please log in with your credentials.
          </p>
          <Button asChild className="w-full">
            <Link href="/">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/20 mx-auto">
            <ClockIcon className="size-6 text-yellow-500" />
          </div>
          <h1 className="text-xl font-bold">Invite expired</h1>
          <p className="text-sm text-muted-foreground">
            This invite link expired on{" "}
            <strong>
              {invite.expiresAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
            . Please ask your admin to send a new invite.
          </p>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Welcome, {invite.user.name || invite.user.username}!
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              Set a password to activate your{" "}
              <span className="font-medium text-foreground">{invite.user.role.toLowerCase().replace("_", " ")}</span>{" "}
              account at <span className="font-medium text-foreground">{invite.user.email}</span>.
            </p>
          </div>

          <InviteSetupForm token={token} />

          <p className="text-center text-xs text-muted-foreground">
            Wrong account?{" "}
            <Link href="/" className="text-primary hover:underline underline-offset-4">
              Go to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
