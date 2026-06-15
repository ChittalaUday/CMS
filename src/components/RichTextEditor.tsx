"use client"

import { useMemo } from "react"
import { Plate, usePlateEditor, PlateContent } from "platejs/react"
import { 
  BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin,
  H1Plugin, H2Plugin, BlockquotePlugin, HorizontalRulePlugin
} from "@platejs/basic-nodes/react"
import { 
  Bold, Italic, Strikethrough, Code, 
  Heading1, Heading2, Quote, Minus, Undo, Redo, Underline
} from "lucide-react"

interface RichTextEditorProps {
  content: string
  contentJson?: any
  onChange: (html: string, json: any) => void
}

// Custom Slate to HTML serializer for basic usage
function serializeSlateToHtml(nodes: any[]): string {
  if (!nodes) return ""
  return nodes.map(node => {
    if (!node) return ""
    if (node.text !== undefined) {
      let html = node.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      if (node.bold) html = `<strong>${html}</strong>`
      if (node.italic) html = `<em>${html}</em>`
      if (node.underline) html = `<u>${html}</u>`
      if (node.strikethrough) html = `<s>${html}</s>`
      if (node.code) html = `<code>${html}</code>`
      return html
    }

    const childrenHtml = serializeSlateToHtml(node.children || [])
    switch (node.type) {
      case 'h1':
        return `<h1>${childrenHtml}</h1>`
      case 'h2':
        return `<h2>${childrenHtml}</h2>`
      case 'blockquote':
        return `<blockquote>${childrenHtml}</blockquote>`
      case 'hr':
        return `<hr />`
      case 'p':
      default:
        return `<p>${childrenHtml}</p>`
    }
  }).join("")
}

// Custom HTML to Slate deserializer
function deserializeHtmlToSlate(html: string): any[] {
  if (!html) return [{ type: 'p', children: [{ text: '' }] }]
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const nodes: any[] = []
    
    const parseNode = (el: Node): any => {
      if (el.nodeType === Node.TEXT_NODE) {
        return { text: el.textContent || "" }
      }
      if (el.nodeType !== Node.ELEMENT_NODE) {
        return null
      }
      const element = el as HTMLElement
      const children = Array.from(element.childNodes).map(parseNode).filter(Boolean)
      
      const tag = element.tagName.toLowerCase()
      switch (tag) {
        case 'h1':
          return { type: 'h1', children: children.length ? children : [{ text: '' }] }
        case 'h2':
          return { type: 'h2', children: children.length ? children : [{ text: '' }] }
        case 'blockquote':
          return { type: 'blockquote', children: children.length ? children : [{ text: '' }] }
        case 'hr':
          return { type: 'hr', children: [{ text: '' }] }
        case 'strong':
        case 'b':
          return children.map(c => ({ ...c, bold: true }))
        case 'em':
        case 'i':
          return children.map(c => ({ ...c, italic: true }))
        case 'u':
          return children.map(c => ({ ...c, underline: true }))
        case 's':
        case 'strike':
          return children.map(c => ({ ...c, strikethrough: true }))
        case 'code':
          return children.map(c => ({ ...c, code: true }))
        case 'p':
        default:
          return { type: 'p', children: children.length ? children : [{ text: '' }] }
      }
    }
    
    Array.from(doc.body.childNodes).forEach(child => {
      const parsed = parseNode(child)
      if (Array.isArray(parsed)) {
        nodes.push(...parsed)
      } else if (parsed) {
        nodes.push(parsed)
      }
    })
    
    return nodes.length > 0 ? nodes : [{ type: 'p', children: [{ text: '' }] }]
  } catch (e) {
    return [{ type: 'p', children: [{ text: html.replace(/<[^>]*>/g, '') }] }]
  }
}

export function RichTextEditor({ content, contentJson, onChange }: RichTextEditorProps) {
  const initialValue = useMemo(() => {
    if (contentJson && Array.isArray(contentJson)) {
      return contentJson
    }
    if (content) {
      return deserializeHtmlToSlate(content)
    }
    return [{ type: 'p', children: [{ text: '' }] }]
  }, [content, contentJson])

  const editor = usePlateEditor({
    value: initialValue,
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin,
      H1Plugin,
      H2Plugin,
      BlockquotePlugin,
      HorizontalRulePlugin
    ]
  })

  // Handle onChange
  const handleEditorChange = () => {
    if (!editor) return
    const html = serializeSlateToHtml(editor.children)
    onChange(html, editor.children)
  }

  const renderElement = (props: any) => {
    const { element, attributes, children } = props
    switch (element.type) {
      case 'h1':
        return <h1 {...attributes} className="text-xl font-bold text-foreground mt-4 mb-2">{children}</h1>
      case 'h2':
        return <h2 {...attributes} className="text-lg font-semibold text-foreground mt-3 mb-1">{children}</h2>
      case 'blockquote':
        return (
          <blockquote {...attributes} className="border-l-4 border-border pl-3 italic text-muted-foreground my-4">
            {children}
          </blockquote>
        )
      case 'hr':
        return (
          <div {...attributes} contentEditable={false} className="my-6 border-t border-border">
            {children}
          </div>
        )
      case 'p':
      default:
        return <p {...attributes} className="text-sm leading-relaxed text-foreground mb-2">{children}</p>
    }
  }

  const renderLeaf = (props: any) => {
    const { leaf, attributes, children } = props
    let el = children
    if (leaf.bold) el = <strong>{el}</strong>
    if (leaf.italic) el = <em>{el}</em>
    if (leaf.underline) el = <u>{el}</u>
    if (leaf.strikethrough) el = <s>{el}</s>
    if (leaf.code) el = <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{el}</code>
    return <span {...attributes}>{el}</span>
  }

  const ToggleButton = ({ 
    onClick, 
    children, 
    title 
  }: { 
    onClick: () => void
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-ring flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
        <ToggleButton
          title="Bold"
          onClick={() => editor.tf.toggleMark('bold')}
        >
          <Bold className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Italic"
          onClick={() => editor.tf.toggleMark('italic')}
        >
          <Italic className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Underline"
          onClick={() => editor.tf.toggleMark('underline')}
        >
          <Underline className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Strikethrough"
          onClick={() => editor.tf.toggleMark('strikethrough')}
        >
          <Strikethrough className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Inline Code"
          onClick={() => editor.tf.toggleMark('code')}
        >
          <Code className="size-4" />
        </ToggleButton>

        <div className="w-[1px] h-6 bg-border mx-1" />

        <ToggleButton
          title="Heading 1"
          onClick={() => editor.tf.toggleBlock('h1')}
        >
          <Heading1 className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Heading 2"
          onClick={() => editor.tf.toggleBlock('h2')}
        >
          <Heading2 className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Blockquote"
          onClick={() => editor.tf.toggleBlock('blockquote')}
        >
          <Quote className="size-4" />
        </ToggleButton>

        <div className="w-[1px] h-6 bg-border mx-1" />

        <ToggleButton
          title="Horizontal Rule"
          onClick={() => editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] } as any)}
        >
          <Minus className="size-4" />
        </ToggleButton>

        <div className="flex-1" />

        <ToggleButton
          title="Undo"
          onClick={() => editor.undo()}
        >
          <Undo className="size-4" />
        </ToggleButton>
        <ToggleButton
          title="Redo"
          onClick={() => editor.redo()}
        >
          <Redo className="size-4" />
        </ToggleButton>
      </div>

      {/* Editor Content Area */}
      <div className="bg-background flex-1 cursor-text min-h-[300px]">
        <Plate editor={editor} onChange={handleEditorChange}>
          <PlateContent 
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Write something amazing..."
            className="focus:outline-none min-h-[300px] px-4 py-3 text-sm text-foreground"
          />
        </Plate>
      </div>
    </div>
  )
}
