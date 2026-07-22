export type Step = 1 | 2 | 3 | 4;

export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "TEMPORARY";
export type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "YES_NO" | "FILE";
export type SalaryMode = "none" | "single" | "range";

export interface BasicDetails {
  title: string;
  slug: string;
  department: string;
  location: string;
  jobType: JobType;
  salaryMode: SalaryMode;
  salaryValue: string;
  salaryMin: string;
  salaryMax: string;
  requiredExperience: string;
  closingDate: string;
}

export interface DescriptionDetails {
  description: string;
  descriptionJson: unknown;
  responsibilities: string;
  responsibilitiesJson: unknown;
  requirements: string;
  requirementsJson: unknown;
}

export interface QuestionDraft {
  tempId: string;
  question: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options: string[];
  newOption: string;
}

export interface ExistingJob {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  jobType: JobType;
  description: string;
  descriptionJson: unknown;
  responsibilities: string | null;
  responsibilitiesJson: unknown;
  requirements: string | null;
  requirementsJson: unknown;
  salaryMin: number | null;
  salaryMax: number | null;
  requiredExperience: string | null;
  currency: string;
  closingDate: Date | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  draftParentId: string | null;
  draftParent: { id: string; title: string; status: string } | null;
  questions: {
    id: string;
    question: string;
    type: QuestionType;
    required: boolean;
    order: number;
    options: unknown;
  }[];
  keywords: string[];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short Answer",
  LONG_TEXT: "Long Answer",
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  YES_NO: "Yes / No",
  FILE: "File Upload",
};
