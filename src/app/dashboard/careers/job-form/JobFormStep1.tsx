"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, AlertCircle, IndianRupeeIcon, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { BasicDetails, JobType, SalaryMode, JOB_TYPE_LABELS } from "./types"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
      <AlertCircle className="size-3 shrink-0" />
      {message}
    </p>
  )
}

interface JobFormStep1Props {
  basic: BasicDetails
  setBasic: React.Dispatch<React.SetStateAction<BasicDetails>>
  errors: Record<string, string>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  isEdit: boolean
  slugEditedRef: React.MutableRefObject<boolean>
  toSlug: (text: string) => string
  
  departments: string[]
  isDeptsLoading: boolean
  setIsAddingDept: (val: boolean) => void

  locations: string[]
  isLocsLoading: boolean
  setIsAddingLoc: (val: boolean) => void

  slugStatus: "idle" | "checking" | "available" | "unavailable"
  suggestedSlug: string | null
  onTitleBlur: () => void
  onSlugBlur: () => void
  onApplySuggestedSlug: (suggested: string) => void
}

export function JobFormStep1({
  basic,
  setBasic,
  errors,
  setErrors,
  isEdit,
  slugEditedRef,
  toSlug,
  departments,
  isDeptsLoading,
  setIsAddingDept,
  locations,
  isLocsLoading,
  setIsAddingLoc,
  slugStatus,
  suggestedSlug,
  onTitleBlur,
  onSlugBlur,
  onApplySuggestedSlug
}: JobFormStep1Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-1 pb-3 border-b border-border/60">
        <h2 className="text-xl font-bold">Basic Details</h2>
        <p className="text-sm text-muted-foreground">Essential information about the position.</p>
      </div>

      {/* Job Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Job Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={basic.title}
          onChange={(e) => {
            const title = e.target.value
            setBasic((b) => ({
              ...b,
              title,
              slug: isEdit || slugEditedRef.current ? b.slug : toSlug(title),
            }))
            if (errors.title) setErrors((e) => ({ ...e, title: "" }))
            if (errors.slug) setErrors((e) => ({ ...e, slug: "" }))
          }}
          onBlur={onTitleBlur}
          placeholder="e.g. Senior Frontend Engineer"
          className="h-9 bg-muted/30 border-border/80 text-sm"
        />
        <FieldError message={errors.title} />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            URL Slug <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-1.5 text-xs">
            {slugStatus === "checking" && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Checking...
              </span>
            )}
            {slugStatus === "available" && (
              <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                <CheckCircle2 className="size-3.5" />
                Available
              </span>
            )}
            {slugStatus === "unavailable" && (
              <span className="inline-flex items-center gap-1 text-destructive font-medium">
                <AlertCircle className="size-3.5" />
                Already taken
              </span>
            )}
          </div>
        </div>
        <div className={`flex items-center rounded-md border bg-muted/30 overflow-hidden focus-within:ring-1 transition-colors ${
          slugStatus === "unavailable" ? "border-destructive/80 focus-within:ring-destructive" :
          slugStatus === "available" ? "border-emerald-500/60 focus-within:ring-emerald-500" :
          "border-border/80 focus-within:ring-ring"
        }`}>
          <span className="px-3 text-xs text-muted-foreground font-mono border-r border-border/60 h-9 flex items-center bg-muted/50 shrink-0">
            /careers/
          </span>
          <input
            id="slug"
            type="text"
            value={basic.slug}
            onChange={(e) => {
              slugEditedRef.current = true
              setBasic((b) => ({ ...b, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
              if (errors.slug) setErrors((e) => ({ ...e, slug: "" }))
            }}
            onBlur={onSlugBlur}
            placeholder="senior-frontend-engineer"
            className="flex-1 h-9 px-3 text-sm font-mono bg-transparent outline-none"
          />
        </div>

        {/* Inline Suggestion Banner for Conflict */}
        {slugStatus === "unavailable" && suggestedSlug && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs mt-1.5 min-w-0">
            <div className="flex items-center gap-2 text-destructive min-w-0">
              <AlertCircle className="size-4 shrink-0" />
              <span className="break-all">
                Slug <strong className="font-mono">/careers/{basic.slug}</strong> already exists.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs font-semibold bg-background border-destructive/30 hover:bg-destructive/15 hover:text-destructive shrink-0 gap-1 self-start sm:self-auto"
              onClick={() => onApplySuggestedSlug(suggestedSlug)}
            >
              <Sparkles className="size-3 text-amber-500 shrink-0" />
              Use Suggested Slug
            </Button>
          </div>
        )}
  
        {/* Prevent duplicate error message below banner */}
        {!(slugStatus === "unavailable" && suggestedSlug) && (
          <FieldError message={errors.slug} />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Department */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="dept" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Department <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => setIsAddingDept(true)}
            >
              <Plus className="size-3.5" />
              <span className="sr-only">Add Department</span>
            </Button>
          </div>
          
          <Select
            value={basic.department}
            onValueChange={(val) => {
              setBasic((b) => ({ ...b, department: val }))
              if (errors.department) setErrors((e) => ({ ...e, department: "" }))
            }}
            disabled={isDeptsLoading}
          >
            <SelectTrigger id="dept" className="h-9 bg-muted/30 border-border/80 text-sm" suppressHydrationWarning>
              <SelectValue placeholder={isDeptsLoading ? "Loading..." : "Select Department"} />
            </SelectTrigger>
            <SelectContent position="popper">
              {departments.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No departments found
                </SelectItem>
              ) : (
                departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))
              )}
              <div className="border-t border-border/60 my-1" />
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary font-semibold hover:bg-muted rounded-md transition-colors text-left cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsAddingDept(true)
                }}
              >
                <Plus className="size-3.5" />
                Add Department
              </button>
            </SelectContent>
          </Select>
          <FieldError message={errors.department} />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Location <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => setIsAddingLoc(true)}
            >
              <Plus className="size-3.5" />
              <span className="sr-only">Add Location</span>
            </Button>
          </div>
          
          <Select
            value={basic.location}
            onValueChange={(val) => {
              setBasic((b) => ({ ...b, location: val }))
              if (errors.location) setErrors((e) => ({ ...e, location: "" }))
            }}
            disabled={isLocsLoading}
          >
            <SelectTrigger id="location" className="h-9 bg-muted/30 border-border/80 text-sm" suppressHydrationWarning>
              <SelectValue placeholder={isLocsLoading ? "Loading..." : "Select Location"} />
            </SelectTrigger>
            <SelectContent position="popper">
              {locations.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No locations found
                </SelectItem>
              ) : (
                locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))
              )}
              <div className="border-t border-border/60 my-1" />
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-primary font-semibold hover:bg-muted rounded-md transition-colors text-left cursor-pointer"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsAddingLoc(true)
                }}
              >
                <Plus className="size-3.5" />
                Add Location
              </button>
            </SelectContent>
          </Select>
          <FieldError message={errors.location} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Job Type */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Job Type <span className="text-destructive">*</span>
          </Label>
          <Select value={basic.jobType} onValueChange={(v) => setBasic((b) => ({ ...b, jobType: v as JobType }))}>
            <SelectTrigger className="h-9 bg-muted/30 border-border/80 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(JOB_TYPE_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Required Experience */}
        <div className="space-y-2">
          <Label htmlFor="requiredExperience" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Required Experience <span className="text-muted-foreground/60 font-normal normal-case">(optional, years)</span>
          </Label>
          <Input
            id="requiredExperience"
            type="text"
            value={basic.requiredExperience}
            onChange={(e) => setBasic((b) => ({ ...b, requiredExperience: e.target.value }))}
            placeholder="e.g. 3, 2-5, or 3+"
            className="h-9 bg-muted/30 border-border/80 text-sm"
          />
          <FieldError message={errors.requiredExperience} />
        </div>

        {/* Closing Date */}
        <div className="space-y-2">
          <Label htmlFor="closingDate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Closing Date <span className="text-muted-foreground/60 font-normal normal-case">(optional)</span>
          </Label>
          <Input
            id="closingDate"
            type="date"
            value={basic.closingDate}
            onChange={(e) => setBasic((b) => ({ ...b, closingDate: e.target.value }))}
            min={new Date().toISOString().split("T")[0]}
            className="h-9 bg-muted/30 border-border/80 text-sm"
          />
        </div>
      </div>

      {/* Salary — INR only */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <IndianRupeeIcon className="size-3" />
            Salary <span className="text-muted-foreground/60 font-normal normal-case">(optional, INR)</span>
          </Label>
          {/* Mode selector */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/60">
            {(["none", "single", "range"] as SalaryMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setBasic((b) => ({ ...b, salaryMode: mode }))}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  basic.salaryMode === mode
                    ? "bg-background text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "none" ? "Not specified" : mode === "single" ? "Fixed" : "Range"}
              </button>
            ))}
          </div>
        </div>

        {basic.salaryMode === "single" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground shrink-0">₹</span>
            <Input
              type="number"
              min={0}
              value={basic.salaryValue}
              onChange={(e) => setBasic((b) => ({ ...b, salaryValue: e.target.value }))}
              placeholder="e.g. 1200000"
              className="h-9 bg-muted/30 border-border/80 text-sm max-w-xs"
            />
            <span className="text-xs text-muted-foreground">per year</span>
          </div>
        )}

        {basic.salaryMode === "range" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground shrink-0">₹</span>
            <Input
              type="number"
              min={0}
              value={basic.salaryMin}
              onChange={(e) => {
                setBasic((b) => ({ ...b, salaryMin: e.target.value }))
                if (errors.salaryMin) setErrors((e) => ({ ...e, salaryMin: "" }))
              }}
              placeholder="Min"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
            <span className="text-muted-foreground text-sm shrink-0">–</span>
            <Input
              type="number"
              min={0}
              value={basic.salaryMax}
              onChange={(e) => setBasic((b) => ({ ...b, salaryMax: e.target.value }))}
              placeholder="Max"
              className="h-9 bg-muted/30 border-border/80 text-sm"
            />
            <span className="text-xs text-muted-foreground shrink-0">per year</span>
          </div>
        )}
        <FieldError message={errors.salaryMin} />
      </div>
    </div>
  )
}
