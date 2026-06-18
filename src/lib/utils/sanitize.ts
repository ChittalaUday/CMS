import sanitizeHtml from "sanitize-html"

// Rich blog/CMS content — allows full editorial HTML but strips scripts and event handlers.
const BLOG_ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a",
  "img",
  "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "div", "span",
  "details", "summary",
  "video", "source",
]

const BLOG_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
  video: ["src", "controls", "autoplay", "loop", "muted", "poster", "width", "height"],
  source: ["src", "type"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  "*": ["class", "id", "style"],
}

export function sanitizeBlogHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: BLOG_ALLOWED_TAGS,
    allowedAttributes: BLOG_ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    // Strip data: URIs which can carry payloads
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
  })
}

// Plain-text fields (e.g., cover letters, short answers) — strip all HTML.
export function sanitizePlainText(dirty: string): string {
  return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} })
}
