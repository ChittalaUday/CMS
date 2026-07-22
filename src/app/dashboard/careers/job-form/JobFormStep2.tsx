"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Sparkles, AlertCircle } from "lucide-react"
import { RichTextEditor } from "@/components/RichTextEditor"
import { DescriptionDetails } from "./types"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

interface JobFormStep2Props {
  desc: DescriptionDetails
  setDesc: React.Dispatch<React.SetStateAction<DescriptionDetails>>
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  includeTemplate: boolean
  setIncludeTemplate: (val: boolean) => void
  globalTemplateConfig: any
}

export function JobFormStep2({
  desc,
  setDesc,
  errors,
  setErrors,
  includeTemplate,
  setIncludeTemplate,
  globalTemplateConfig
}: JobFormStep2Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold">Job Description</h2>
        <p className="text-sm text-muted-foreground">
          Use the rich text editor for formatting — bullet points, headings, bold text, etc.
        </p>
      </div>

      {/* Job Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Job Description <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id="includeTemplate"
              checked={includeTemplate}
              onCheckedChange={setIncludeTemplate}
            />
            <Label htmlFor="includeTemplate" className="text-xs font-semibold cursor-pointer">
              Include About Company Description
            </Label>
          </div>
        </div>
        {includeTemplate && globalTemplateConfig?.defaultTemplate && globalTemplateConfig.templatePosition === "start" && (
          <div className="rounded-xl border border-border/80 overflow-hidden p-4 bg-muted/10 text-sm text-muted-foreground article-body opacity-80 pointer-events-none mb-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="size-3" /> About Company Description (Prepended Preview)
            </div>
            <div dangerouslySetInnerHTML={{ __html: globalTemplateConfig.defaultTemplate }} />
          </div>
        )}
        <div className="rounded-xl border border-border/80 overflow-hidden flex flex-col">
          <RichTextEditor
            content={desc.description}
            contentJson={desc.descriptionJson}
            onChange={(html, json) => {
              setDesc((d) => ({ ...d, description: html, descriptionJson: json }))
              if (errors.description) setErrors((e) => ({ ...e, description: "" }))
            }}
          />
        </div>

        <FieldError message={errors.description} />
      </div>

      {/* Roles & Responsibilities */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Roles & Responsibilities <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
        </Label>
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <RichTextEditor
            content={desc.responsibilities}
            contentJson={desc.responsibilitiesJson}
            onChange={(html, json) =>
              setDesc((d) => ({ ...d, responsibilities: html, responsibilitiesJson: json }))
            }
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Requirements & Qualifications <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
        </Label>
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <RichTextEditor
            content={desc.requirements}
            contentJson={desc.requirementsJson}
            onChange={(html, json) =>
              setDesc((d) => ({ ...d, requirements: html, requirementsJson: json }))
            }
          />
        </div>
      </div>
      {includeTemplate && globalTemplateConfig?.defaultTemplate && globalTemplateConfig.templatePosition === "end" && (
        <div className="rounded-xl border border-border/80 overflow-hidden p-4 bg-muted/10 text-sm text-muted-foreground article-body opacity-80 pointer-events-none">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="size-3" /> About Company Description (Appended Preview)
          </div>
          <div dangerouslySetInnerHTML={{ __html: globalTemplateConfig.defaultTemplate }} />
        </div>
      )}
    </div>
  )
}
