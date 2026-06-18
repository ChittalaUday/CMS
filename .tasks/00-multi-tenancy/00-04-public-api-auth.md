# Sub-task 00-04 — Public API Authentication

**Status:** TODO  
**Effort:** ~1 day  
**Depends on:** 00-02  
**Blocks:** nothing (can run in parallel with 00-03)

---

## Goal

Lock down all `/api/public/*` routes behind API key authentication. Each valid key identifies a client and returns only that client's data. Add per-client CORS based on the `Client.domain` field.

---

## Routes to Update

| Route | File |
|-------|------|
| `GET /api/public/blogs` | `src/app/api/public/blogs/route.ts` |
| `GET /api/public/blogs/[slug]` | `src/app/api/public/blogs/[slug]/route.ts` |
| `POST /api/public/blogs/view` | `src/app/api/public/blogs/view/route.ts` |
| `POST /api/public/careers/apply` | `src/app/api/public/careers/apply/route.ts` |

---

## Pattern for Each Route

```ts
import { validateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const auth = await validateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 })
  }
  if (!auth.scopes.includes('read:blogs')) {
    return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 })
  }

  const posts = await prisma.post.findMany({
    where: { published: true, clientId: auth.clientId },  // ← scoped
    // ... existing select unchanged
  })

  // CORS — match client's registered domain
  const client = await prisma.client.findUnique({
    where: { id: auth.clientId },
    select: { domain: true },
  })
  const origin = client?.domain ? `https://${client.domain}` : '*'

  return new NextResponse(JSON.stringify({ posts }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  })
}
```

### OPTIONS preflight handler (add to each route file)

```ts
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') ?? '*'
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    },
  })
}
```

---

## Scope Requirements Per Route

| Route | Required Scope |
|-------|---------------|
| `GET /api/public/blogs` | `read:blogs` |
| `GET /api/public/blogs/[slug]` | `read:blogs` |
| `POST /api/public/blogs/view` | `read:blogs` |
| `POST /api/public/careers/apply` | `write:applications` |

---

## Acceptance Criteria

- [ ] All routes return `401` when no API key is provided
- [ ] Valid key scoped to the correct client returns only that client's data
- [ ] Revoked key returns `401`
- [ ] Expired key returns `401`
- [ ] Key without required scope returns `403`
- [ ] `lastUsedAt` is updated on each valid request
- [ ] `Access-Control-Allow-Origin` matches the client's `domain` field (or `*` if domain not set)
- [ ] OPTIONS preflight returns correct CORS headers
