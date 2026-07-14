import { LoginForm } from "@/components/login-form"
import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"

export default async function Page() {
  const user = await getSession()
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
