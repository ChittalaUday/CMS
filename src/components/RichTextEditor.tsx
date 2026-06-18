"use client"

import { PlateEditor } from "@/components/editor/plate-editor"

interface RichTextEditorProps {
  content: string
  contentJson?: any
  onChange: (html: string, json: any, md?: string) => void
}

export function RichTextEditor({ contentJson, onChange }: RichTextEditorProps) {
  return (
    <div className="w-full relative border rounded-md min-h-[150px]">
      <PlateEditor
        initialValue={contentJson || undefined}
        onChange={(html, json, md) => onChange(html || md || '', json, md)}
      />
    </div>
  )
}
