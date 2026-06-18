export type ApiEndpoint = {
  method: string
  path: string
  summary: string
  requestExample?: Record<string, unknown>
  responseExample?: Record<string, unknown>
  queryParams?: { name: string; type: string; required: boolean; description: string }[]
  bodyParams?: { name: string; type: string; required: boolean; description: string }[]
}

export type ApiScope = {
  id: string
  /** Derived from the scope ID prefix ("read:" → "read", "write:" → "write") */
  permission: "read" | "write"
  label: string
  description: string
  /** Internal use only — used for route-level enforcement, NOT rendered in token dialog */
  endpoints: ApiEndpoint[]
}

export type ApiCategory = {
  id: string
  label: string
  description: string
  scopes: ApiScope[]
}

export const API_REGISTRY: ApiCategory[] = [
  {
    id: "blogs",
    label: "Blogs",
    description: "Access published blog posts for your client",
    scopes: [
      {
        id: "read:blogs",
        permission: "read",
        label: "Read blogs",
        description: "Fetch published blog posts, individual articles, and record page views",
        endpoints: [
          {
            method: "GET",
            path: "/api/public/blogs",
            summary: "List all published blog posts for the authenticated client",
            queryParams: [
              { name: "limit", type: "number", required: false, description: "Max results to return" },
              { name: "offset", type: "number", required: false, description: "Pagination offset" },
            ],
            responseExample: {
              posts: [
                {
                  id: "cuid",
                  title: "Getting Started",
                  slug: "getting-started",
                  content: "<p>…</p>",
                  featured: false,
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                  author: { id: "cuid", name: "Jane Doe", avatarUrl: null },
                  featuredImage: null,
                  categories: [{ id: "cuid", name: "News", slug: "news" }],
                },
              ],
            },
          },
          {
            method: "GET",
            path: "/api/public/blogs/:slug",
            summary: "Fetch a single published post by slug",
            responseExample: {
              post: {
                id: "cuid",
                title: "Getting Started",
                slug: "getting-started",
                content: "<p>…</p>",
                contentJson: {},
                createdAt: "2026-01-01T00:00:00.000Z",
                author: { id: "cuid", name: "Jane Doe", avatarUrl: null },
                featuredImage: null,
                categories: [{ id: "cuid", name: "News", slug: "news" }],
              },
            },
          },
          {
            method: "POST",
            path: "/api/public/blogs/view",
            summary: "Record a page view for a blog post (analytics)",
            bodyParams: [
              { name: "slug", type: "string", required: false, description: "Post slug (use slug or postId)" },
              { name: "postId", type: "string", required: false, description: "Post ID (use slug or postId)" },
            ],
            requestExample: { slug: "getting-started" },
            responseExample: { success: true, message: "View recorded" },
          },
        ],
      },
    ],
  },
  {
    id: "careers",
    label: "Careers",
    description: "Job postings and candidate applications",
    scopes: [
      {
        id: "read:careers",
        permission: "read",
        label: "Read job postings",
        description: "Fetch published job listings for display on your careers page",
        endpoints: [],
      },
      {
        id: "write:applications",
        permission: "write",
        label: "Submit applications",
        description: "Submit job applications on behalf of candidates from your website",
        endpoints: [
          {
            method: "POST",
            path: "/api/public/careers/apply",
            summary: "Submit a job application with optional resume upload",
            bodyParams: [
              { name: "jobId", type: "string", required: true, description: "ID of the job posting" },
              { name: "applicantName", type: "string", required: true, description: "Full name of the applicant" },
              { name: "applicantEmail", type: "string", required: true, description: "Applicant's email address" },
              { name: "applicantPhone", type: "string", required: false, description: "Applicant's phone number" },
              { name: "resumeUrl", type: "string", required: false, description: "URL to a pre-uploaded resume" },
              { name: "coverLetter", type: "string", required: false, description: "Cover letter text" },
              { name: "answers", type: "{ questionId: string; answer: string }[]", required: false, description: "Answers to job-specific questions" },
            ],
            requestExample: {
              jobId: "cuid",
              applicantName: "Jane Doe",
              applicantEmail: "jane@example.com",
              applicantPhone: "+91 9876543210",
              coverLetter: "I am excited to apply…",
              answers: [{ questionId: "cuid", answer: "5 years" }],
            },
            responseExample: {
              success: true,
              application: { id: "cuid", status: "NEW", createdAt: "2026-01-01T00:00:00.000Z" },
            },
          },
        ],
      },
    ],
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getAllScopeIds(): string[] {
  return API_REGISTRY.flatMap((cat) => cat.scopes.map((s) => s.id))
}

export function getScopeById(id: string): ApiScope | undefined {
  return API_REGISTRY.flatMap((c) => c.scopes).find((s) => s.id === id)
}

/** Returns HTTP methods used by a scope — for display purposes only */
export function getScopeMethods(scope: ApiScope): string[] {
  const methods = [...new Set(scope.endpoints.map((e) => e.method))]
  return methods.length > 0 ? methods : []
}
