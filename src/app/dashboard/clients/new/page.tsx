import { ClientForm } from "../ClientForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewClientPage() {

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Client</h1>
          <p className="text-sm text-muted-foreground">Create a new tenant client.</p>
        </div>
      </div>
      <ClientForm />
    </div>
  )
}
