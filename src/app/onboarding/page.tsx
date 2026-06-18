import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"
import { OnboardingForm } from "./OnboardingForm"
import { GalleryVerticalEndIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const user = await getSession()

  if (!user) redirect("/")
  if (user.onboardingCompleted) redirect("/dashboard")

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Welcome to the team{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Set up your profile. All fields are optional — you can update them anytime from your account settings.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 shadow-sm">
            <OnboardingForm
              initialName={user.name ?? ""}
              initialAvatarUrl={user.avatarUrl ?? ""}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
