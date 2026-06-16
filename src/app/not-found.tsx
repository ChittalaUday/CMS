import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-7xl font-bold">404</p>
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground text-sm">The page you were looking for doesn&apos;t exist.</p>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
