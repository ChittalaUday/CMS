/**
 * A small Markdown subset for importing articles: `##`/`###` headings, paragraphs, `-` and `1.` lists,
 * `>` quotes, `**bold**` and `[text](url)`. One source gives both the HTML the public API serves and the
 * Plate value the dashboard editor opens (lists are Plate indent lists: `indent` + `listStyleType`).
 */

type Inline = { text: string; bold?: true } | { type: "a"; url: string; children: { text: string }[] }
type PlateNode = { type: string; indent?: number; listStyleType?: string; children: Inline[] }
type Block =
  | { kind: "h2" | "h3" | "p" | "blockquote"; text: string }
  | { kind: "ul" | "ol"; items: string[] }

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/
const LIST_ITEM = { ul: /^- (.*)$/, ol: /^\d+\. (.*)$/ } as const
const HEADINGS = { "## ": "h2", "### ": "h3" } as const

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function inlineParts(text: string): Inline[] {
  return text
    .split(INLINE)
    .filter(Boolean)
    .map((part): Inline => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/)
      if (bold) return { text: bold[1], bold: true }
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (link) return { type: "a", url: link[2], children: [{ text: link[1] }] }
      return { text: part }
    })
}

function inlineHtml(text: string): string {
  return inlineParts(text)
    .map((p) => {
      if ("type" in p) return `<a href="${escapeHtml(p.url)}">${escapeHtml(p.children[0].text)}</a>`
      return p.bold ? `<strong>${escapeHtml(p.text)}</strong>` : escapeHtml(p.text)
    })
    .join("")
}

function listKind(line: string): "ul" | "ol" | null {
  return (Object.keys(LIST_ITEM) as ("ul" | "ol")[]).find((k) => LIST_ITEM[k].test(line)) ?? null
}

function paragraphBlock(lines: string[]): Block {
  const first = lines[0]
  const heading = (Object.keys(HEADINGS) as (keyof typeof HEADINGS)[]).find((p) => first.startsWith(p))
  if (heading) return { kind: HEADINGS[heading], text: first.slice(heading.length).trim() }
  if (first.startsWith("> ")) return { kind: "blockquote", text: lines.map((l) => l.replace(/^> ?/, "")).join(" ") }
  return { kind: "p", text: lines.join(" ") }
}

export function parseBlocks(markdown: string): Block[] {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .flatMap((chunk): Block[] => {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean)
      const kind = listKind(lines[0])
      if (kind && lines.every((l) => LIST_ITEM[kind].test(l))) {
        return [{ kind, items: lines.map((l) => l.match(LIST_ITEM[kind])![1]) }]
      }
      return lines.length ? [paragraphBlock(lines)] : []
    })
}

export function markdownToHtml(markdown: string): string {
  return parseBlocks(markdown)
    .map((b) => {
      if ("items" in b) return `<${b.kind}>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</${b.kind}>`
      return `<${b.kind}>${inlineHtml(b.text)}</${b.kind}>`
    })
    .join("\n")
}

export function markdownToPlate(markdown: string): PlateNode[] {
  return parseBlocks(markdown).flatMap((b): PlateNode[] => {
    if ("items" in b) {
      const listStyleType = b.kind === "ul" ? "disc" : "decimal"
      return b.items.map((i) => ({ type: "p", indent: 1, listStyleType, children: inlineParts(i) }))
    }
    return [{ type: b.kind, children: inlineParts(b.text) }]
  })
}

/** Plain text of the first paragraph: what the website uses as the meta description. */
export function firstParagraphText(markdown: string): string {
  const first = parseBlocks(markdown).find((b) => b.kind === "p") as { text: string } | undefined
  return (first?.text ?? "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
}
