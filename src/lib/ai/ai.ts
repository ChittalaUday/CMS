// ─── Constants ────────────────────────────────────────────────────────────────
export const DEFAULT_MODEL           = process.env.OLLAMA_MODEL           || "qwen3:0.6b"
export const DEFAULT_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "all-minilm:l6-v2"
export const OLLAMA_BASE_URL         = process.env.OLLAMA_API_URL         || "http://localhost:11434"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at: string
  capabilities: string[]
}

export interface GenerateTextOptions {
  model?: string
  prompt: string
  temperature?: number
}

// ─── Server-side: Model Discovery ─────────────────────────────────────────────

/** Fetches all locally installed Ollama models (server-side). */
export async function listOllamaModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.models || []
  } catch {
    return []
  }
}

/** Returns the first available embedding model name from Ollama, falling back to the env default. */
export async function resolveEmbeddingModel(): Promise<string> {
  try {
    const models = await listOllamaModels()
    const embeddingModel = models.find((m) => {
      const caps: string[] = m.capabilities || []
      return caps.includes("embedding")
    })
    return embeddingModel?.name || DEFAULT_EMBEDDING_MODEL
  } catch {
    return DEFAULT_EMBEDDING_MODEL
  }
}

// ─── Server-side: Text Generation ─────────────────────────────────────────────

/** Generates text from a local Ollama model. Falls back to DEFAULT_MODEL. */
export async function generateText({
  model,
  prompt,
  temperature = 0.1,
}: GenerateTextOptions): Promise<string> {
  const finalModel = model || DEFAULT_MODEL
  const url = `${OLLAMA_BASE_URL}/api/generate`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: finalModel,
      prompt,
      stream: false,
      options: { temperature },
    }),
  })

  if (!res.ok) {
    let body = ""
    try { body = await res.text() } catch { /* ignore */ }
    throw new Error(`Ollama API request failed (${res.status} ${res.statusText})${body ? `: ${body}` : ""}`)
  }

  const data = await res.json()
  return data.response || ""
}

// ─── Server-side: Embeddings ──────────────────────────────────────────────────

/** Generates a vector embedding for the given text using an Ollama embedding model. */
export async function embedText(text: string, model?: string): Promise<number[]> {
  const finalModel = model || DEFAULT_EMBEDDING_MODEL
  const url = `${OLLAMA_BASE_URL}/api/embeddings`

  // Truncate text to a safe limit (e.g., 1000 chars) to prevent context length errors (e.g., in all-minilm)
  const safeText = text.length > 1000 ? text.slice(0, 1000) : text

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: finalModel, prompt: safeText }),
  })

  if (!res.ok) {
    let body = ""
    try { body = await res.text() } catch { /* ignore */ }
    throw new Error(`Ollama embedding request failed (${res.status} ${res.statusText})${body ? `: ${body}` : ""}`)
  }

  const data = await res.json()
  return data.embedding || []
}

/** Computes cosine similarity between two vectors. Returns a value between -1 and 1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0
  const dot  = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

/**
 * Computes the semantic similarity between two texts using an Ollama embedding model.
 * Returns a percentage (0–100) where 100 = identical meaning.
 */
export async function computeSemanticSimilarity(
  text1: string,
  text2: string,
  embeddingModel?: string,
): Promise<{ score: number; model: string }> {
  const model = embeddingModel || await resolveEmbeddingModel()
  try {
    const [emb1, emb2] = await Promise.all([
      embedText(text1, model),
      embedText(text2, model),
    ])
    const similarity = cosineSimilarity(emb1, emb2)
    // Cosine similarity for text is typically in 0.2–1.0 range; normalise to 0–100
    const score = Math.round(Math.max(0, similarity) * 100)
    return { score, model }
  } catch (err) {
    console.warn(`[AI] Semantic similarity failed (${model}):`, err)
    return { score: -1, model }
  }
}
