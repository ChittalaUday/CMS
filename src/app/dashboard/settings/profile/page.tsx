import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { ProfileForm } from "./ProfileForm"

export default async function ProfileSettingsPage() {
  const user = await getSession()
  if (!user) redirect("/")

  return (
    <ProfileForm
      initialUsername={user.username}
      initialName={user.name ?? ""}
      initialBio={user.bio ?? ""}
      initialAvatarUrl={user.avatarUrl ?? ""}
      email={user.email}
      role={user.role}
    />
  )
}
