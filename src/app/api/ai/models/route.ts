import type { NextRequest } from "next/server"

export async function GET(_req: NextRequest) {
  const baseUrl = process.env.OLLAMA_API_URL || "http://localhost:11434"

  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return Response.json({ error: "Ollama not available", generationModels: [], embeddingModels: [] }, { status: 200 })
    }

    const data = await res.json()
    const allModels = data.models || []

    const toModelShape = (m: {
      name: string; model: string; size: number; digest: string; modified_at: string; capabilities?: string[]
    }) => ({
      name: m.name,
      model: m.model,
      size: m.size,
      digest: m.digest,
      modified_at: m.modified_at,
      capabilities: m.capabilities || [],
    })

    // Text-generation capable models (can use /api/generate)
    const generationModels = allModels
      .filter((m: { capabilities?: string[] }) => {
        const caps: string[] = m.capabilities || []
        const hasGeneration = caps.includes("completion") || caps.includes("tools") || caps.includes("thinking")
        const isEmbeddingOnly = caps.length > 0 && caps.every((c: string) => c === "embedding")
        return hasGeneration || (!isEmbeddingOnly && caps.length === 0)
      })
      .map(toModelShape)

    // Embedding-only models (can use /api/embeddings for semantic similarity)
    const embeddingModels = allModels
      .filter((m: { capabilities?: string[] }) => {
        const caps: string[] = m.capabilities || []
        return caps.includes("embedding")
      })
      .map(toModelShape)

    return Response.json({ generationModels, embeddingModels })
  } catch {
    return Response.json({ error: "Ollama not reachable", generationModels: [], embeddingModels: [] }, { status: 200 })
  }
}
