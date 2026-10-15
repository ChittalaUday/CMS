import { ComparisonForm } from "../ComparisonForm"

export const dynamic = "force-dynamic"

// Access is enforced by ../layout.tsx
export default function NewComparisonPage() {
  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="pb-5 border-b border-border/60 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">New comparison</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Add the columns you are comparing, the rows to compare them on, then fill in each cell.
        </p>
      </div>
      <ComparisonForm />
    </div>
  )
}
