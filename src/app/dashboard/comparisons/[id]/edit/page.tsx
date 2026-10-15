import { notFound } from "next/navigation"
import { getClientScope } from "@/lib/utils/client-context"
import { getComparisonForEdit } from "../../../_data/comparisons-queries"
import { ComparisonForm } from "../../ComparisonForm"

export const dynamic = "force-dynamic"

export default async function EditComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comparison = await getComparisonForEdit(id, await getClientScope())
  if (!comparison) notFound()

  return (
    <div className="space-y-5 w-full px-1 py-3">
      <div className="pb-5 border-b border-border/60 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Edit comparison</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Changes reach your website through the API only while the comparison is published.
        </p>
      </div>
      <ComparisonForm comparisonId={comparison.id} initial={comparison.values} />
    </div>
  )
}
