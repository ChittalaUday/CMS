import assert from "node:assert"
import { articleMetadata, parseArticle } from "../../src/lib/utils/blog-article"

const file = (front: string) => `---\n${front}\n---\nBody text.`
const base = "title: A title\ncategory: GST\ndescription: A short description."

// the keys the file owns are read
const a = parseArticle("a-post.md", file(`${base}\ntags: one, two\nseoTitle: A title | Zenith\ncoverAlt: A person at a desk\nfeatured: true`))
assert.strictEqual(a.slug, "a-post")
assert.deepStrictEqual(a.tags, ["one", "two"])
assert.strictEqual(a.seoTitle, "A title | Zenith")
assert.strictEqual(a.coverAlt, "A person at a desk")
assert.strictEqual(a.featured, true)
assert.strictEqual(a.published, true)
assert.strictEqual(parseArticle("b.md", file(base)).featured, false)

// the limits search results and screen readers allow are enforced
assert.throws(() => parseArticle("c.md", file(`title: T\ncategory: C\ndescription: ${"x".repeat(161)}`)), /description is 161 characters, the limit is 160/)
assert.throws(() => parseArticle("c.md", file(`${base}\nseoTitle: ${"x".repeat(61)}`)), /seoTitle is 61 characters/)
assert.throws(() => parseArticle("c.md", file(`${base}\ncoverAlt: ${"x".repeat(126)}`)), /coverAlt is 126 characters/)
assert.throws(() => parseArticle("c.md", "no front matter"), /missing front matter/)
assert.throws(() => parseArticle("c.md", file("title: T\ncategory: C")), /needs description/)

// a re-import sets what the file owns and keeps what an editor added
const merged = articleMetadata(
  { seoDescription: "old", tags: ["old"], reviewer: "A. Reviewer", relatedServices: "gst-registration", seoTitle: "Editor title", coverAlt: "Editor alt" },
  parseArticle("d.md", file(`${base}\ntags: new`))
)
assert.deepStrictEqual(merged, {
  seoDescription: "A short description.",
  tags: ["new"],
  reviewer: "A. Reviewer",
  relatedServices: "gst-registration",
  seoTitle: "Editor title", // the file has none, so the editor's stays
  coverAlt: "Editor alt",
})
assert.strictEqual(articleMetadata(merged, parseArticle("e.md", file(`${base}\nseoTitle: From file`))).seoTitle, "From file")
// metadata that is missing or not an object starts clean
assert.deepStrictEqual(articleMetadata(null, a), { seoDescription: "A short description.", tags: ["one", "two"], seoTitle: "A title | Zenith", coverAlt: "A person at a desk" })
assert.deepStrictEqual(Object.keys(articleMetadata([1], parseArticle("f.md", file(base)))), ["seoDescription", "tags"])

console.log("blog-article: ok")
