"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, CheckCircle2, Settings2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { RichTextEditor } from "@/components/RichTextEditor"

export function GlobalTemplateConfigButton({ careersConfig, updateCareersConfig }: { 
  careersConfig: any, 
  updateCareersConfig?: (data: any) => Promise<any> 
}) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [template, setTemplate] = useState(careersConfig?.defaultTemplate || "")
  const [templateJson, setTemplateJson] = useState<any>(careersConfig?.defaultTemplateJson || null)
  const [position, setPosition] = useState<"start" | "end">(careersConfig?.templatePosition || "end")
  const [isSavingConfig, setIsSavingConfig] = useState(false)

  if (!updateCareersConfig) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 shadow-sm font-semibold h-10"
        onClick={() => setConfigDialogOpen(true)}
      >
        <Settings2 className="size-4 shrink-0" />
        About Company Description
      </Button>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-5xl w-full p-6 bg-background border border-border rounded-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl font-bold">
              About Company Description
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Set a default rich text description that will automatically be appended or prepended to all published job postings. Useful for company info, EEO statements, or standard benefits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</Label>
              <Select value={position} onValueChange={(v: "start" | "end") => setPosition(v)}>
                <SelectTrigger className="w-full sm:w-64 h-9">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Prepend (Top of job description)</SelectItem>
                  <SelectItem value="end">Append (Bottom of job description)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">Description Content</Label>
              <div className="flex-1 border border-border/80 rounded-md overflow-hidden bg-background">
                <RichTextEditor
                  content={template}
                  contentJson={templateJson}
                  onChange={(html, json) => {
                    setTemplate(html)
                    setTemplateJson(json)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-border/40 shrink-0">
            <Button
              variant="ghost"
              onClick={() => {
                setConfigDialogOpen(false)
                setTemplate(careersConfig?.defaultTemplate || "")
                setTemplateJson(careersConfig?.defaultTemplateJson || null)
                setPosition(careersConfig?.templatePosition || "end")
              }}
              disabled={isSavingConfig}
            >
              Cancel
            </Button>
            <Button
              className="gap-2 font-semibold shadow-sm min-w-28"
              disabled={isSavingConfig}
              onClick={async () => {
                if (!updateCareersConfig) return
                setIsSavingConfig(true)
                try {
                  await updateCareersConfig({
                    defaultTemplate: template,
                    defaultTemplateJson: templateJson,
                    templatePosition: position,
                  })
                  toast.success("About Company Description updated successfully.")
                  setConfigDialogOpen(false)
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to update description")
                } finally {
                  setIsSavingConfig(false)
                }
              }}
            >
              {isSavingConfig ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
