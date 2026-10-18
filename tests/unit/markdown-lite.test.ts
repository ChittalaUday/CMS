import assert from "node:assert"
import { markdownToHtml, markdownToPlate, firstParagraphText } from "../../src/lib/utils/markdown-lite"

const md = `First **bold** paragraph with a [link](https://example.com) & more.

## Heading

- one
- two

1. first
2. second

### Question?

Answer text.`

const html = markdownToHtml(md)
assert.ok(html.startsWith('<p>First <strong>bold</strong> paragraph with a <a href="https://example.com">link</a> &amp; more.</p>'))
assert.ok(html.includes("<h2>Heading</h2>"))
assert.ok(html.includes("<ul><li>one</li><li>two</li></ul>"))
assert.ok(html.includes("<ol><li>first</li><li>second</li></ol>"))
assert.ok(html.includes("<h3>Question?</h3>"))

const plate = markdownToPlate(md)
assert.deepStrictEqual(plate[1], { type: "h2", children: [{ text: "Heading" }] })
assert.deepStrictEqual(plate[2], { type: "p", indent: 1, listStyleType: "disc", children: [{ text: "one" }] })
assert.strictEqual(plate[4].listStyleType, "decimal")
assert.strictEqual(plate.length, 8)
assert.strictEqual(firstParagraphText(md), "First bold paragraph with a link & more.")
assert.ok(!markdownToHtml("<script>x</script>").includes("<script>"))

console.log("✓ markdown-lite: html, plate value, meta description and escaping")
