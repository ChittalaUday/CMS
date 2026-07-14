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
            path: "/api/public/categories",
            summary: "List all categories that have published posts for the authenticated client",
            responseExample: {
              categories: [
                { id: "cmrde6rmv000801rzpwrvvyst", name: "News", slug: "news" }
              ]
            }
          },
          {
            method: "GET",
            path: "/api/public/blogs",
            summary: "List all published blog posts for the authenticated client",
            queryParams: [
              { name: "page", type: "number", required: false, description: "Page number for pagination (defaults to 1)" },
              { name: "limit", type: "number", required: false, description: "Max results to return per page (defaults to 10, max 100)" },
              { name: "category", type: "string", required: false, description: "Filter posts by category slug" },
              { name: "sortBy", type: "string", required: false, description: "Field to sort by: createdAt, updatedAt, or title (defaults to createdAt)" },
              { name: "sortOrder", type: "string", required: false, description: "Sort direction: asc or desc (defaults to desc)" },
            ],
            responseExample: {
              posts: [
                {
                  id: "cmrde6rmv000801rzpwrvvyst",
                  title: "test 2",
                  slug: "test-2",
                  content: "<div class=\"slate-editor\"><div class=\"slate-p\"><span>this is a test </span></div></div>",
                  featured: false,
                  createdAt: "2026-07-09T10:57:03.847Z",
                  updatedAt: "2026-07-09T11:05:50.889Z",
                  author: {
                    id: "cmrdduidd000301rzvjk5u9is",
                    name: "editor",
                    avatarUrl: null
                  },
                  featuredImage: {
                    id: "cmrdehvm40001kopdg8ekvl4v",
                    filename: "Screenshot 2026-07-01 at 12.00.10 PM.png",
                    url: "https://pub-dc5b8bb0f2c2484699b3584b752ff721.r2.dev/uploads/1783595141567_Screenshot_2026-07-01_at_12.00.10_PM.png",
                    mimeType: "image/png",
                    size: 110923
                  },
                  categories: []
                }
              ],
              pagination: {
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1
              }
            },
          },
          {
            method: "GET",
            path: "/api/public/blogs/:slug",
            summary: "Fetch a single published post by slug",
            responseExample: {
              post: {
                id: "cmrdduidd000301rzvjk5u9is",
                title: "Getting Started",
                slug: "getting-started",
                content: "<p>…</p>",
                contentJson: {},
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
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
        endpoints: [
          {
            method: "GET",
            path: "/api/public/careers",
            summary: "List all published job postings for the authenticated client",
            queryParams: [
              { name: "page", type: "number", required: false, description: "Page number for pagination (defaults to 1)" },
              { name: "limit", type: "number", required: false, description: "Max results to return per page (defaults to 10, max 100)" },
              { name: "department", type: "string", required: false, description: "Filter by department" },
              { name: "location", type: "string", required: false, description: "Filter by location" },
              { name: "jobType", type: "string", required: false, description: "Filter by job type: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY" },
              { name: "sortBy", type: "string", required: false, description: "Field to sort by: createdAt, updatedAt, title (defaults to createdAt)" },
              { name: "sortOrder", type: "string", required: false, description: "Sort direction: asc or desc (defaults to desc)" },
            ],
            responseExample: {
              jobs: [
                {
                  id: "cmrde6rmv000801rzpwrvvyst",
                  title: "Software Engineer",
                  slug: "software-engineer",
                  department: "Engineering",
                  location: "Remote",
                  jobType: "FULL_TIME",
                  description: "<p>We are looking for...</p>",
                  salaryMin: 1200000,
                  salaryMax: 1800000,
                  currency: "INR",
                  closingDate: "2026-12-31T00:00:00.000Z",
                  createdAt: "2026-07-09T10:57:03.847Z",
                  updatedAt: "2026-07-09T11:05:50.889Z",
                  questions: [
                    {
                      id: "cmrde6rmv000901rzpwrvvyzz",
                      question: "Years of experience with React?",
                      type: "SHORT_TEXT",
                      required: true,
                      order: 0,
                      options: null
                    }
                  ]
                }
              ],
              pagination: {
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1
              }
            }
          },
          {
            method: "GET",
            path: "/api/public/careers/:slug",
            summary: "Fetch a single published job posting by slug",
            responseExample: {
              job: {
                id: "cmrde6rmv000801rzpwrvvyst",
                title: "Software Engineer",
                slug: "software-engineer",
                department: "Engineering",
                location: "Remote",
                jobType: "FULL_TIME",
                description: "<p>We are looking for...</p>",
                salaryMin: 1200000,
                salaryMax: 1800000,
                currency: "INR",
                closingDate: "2026-12-31T00:00:00.000Z",
                createdAt: "2026-07-09T10:57:03.847Z",
                updatedAt: "2026-07-09T11:05:50.889Z",
                questions: [
                  {
                    id: "cmrde6rmv000901rzpwrvvyzz",
                    question: "Years of experience with React?",
                    type: "SHORT_TEXT",
                    required: true,
                    order: 0,
                    options: null
                  }
                ]
              }
            }
          },
          {
            method: "GET",
            path: "/api/public/careers/departments",
            summary: "List all configured job departments for the authenticated client",
            responseExample: {
              departments: ["Engineering", "Product", "Design", "Sales"]
            }
          },
          {
            method: "GET",
            path: "/api/public/careers/locations",
            summary: "List all configured job locations for the authenticated client",
            responseExample: {
              locations: ["Remote", "Hyderabad, IN", "Bangalore, IN"]
            }
          }
        ],
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
