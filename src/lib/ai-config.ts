/**
 * Returns true when either the AI gateway key is configured OR
 * a local Ollama instance is configured (URL and model, as Ollama requires no key).
 * Call this in Server Components / route handlers only — never import in client bundles.
 */
export function isAIConfigured(): boolean {
  const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
  const hasOllama = Boolean(
    process.env.OLLAMA_API_URL?.trim() &&
    process.env.OLLAMA_MODEL?.trim()
  )
  return hasGateway || hasOllama
}

