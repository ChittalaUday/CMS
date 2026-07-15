"use client"

import type { Value } from "platejs"

import { PlateEditor } from "@/components/editor/plate-editor"

interface RichTextEditorProps {
  content: string
  // Callers store this as opaque Prisma JSON (typed `unknown` at the DB boundary elsewhere
  // in the app), so it can't be narrowed to `Value` at the prop level.
  contentJson?: unknown
  onChange: (html: string, json: Value, md?: string) => void
}

export function RichTextEditor({ contentJson, onChange }: RichTextEditorProps) {
  return (
    <div className="w-full relative border rounded-md min-h-[150px]">
      <PlateEditor
        initialValue={(contentJson as Value | undefined) || undefined}
        onChange={(html, json, md) => onChange(html || md || '', json, md)}
      />
    </div>
  )
}
