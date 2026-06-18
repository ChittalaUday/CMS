# Sub-task 00-06 — API Key Management UI

**Status:** TODO  
**Effort:** ~0.5 day  
**Depends on:** 00-05 (client dashboard pages exist)  
**Blocks:** nothing

---

## Goal

Build the API Keys tab in the client detail page. SUPER_ADMIN can generate new keys (shown once), view all keys for a client, and revoke them.

---

## File to Create

```
src/app/dashboard/clients/ApiKeyManager.tsx
```

This is a client component used inside the API Keys tab of `[id]/page.tsx`.

---

## Key Generation Flow

1. SUPER_ADMIN clicks "Generate New Key"
2. A Dialog opens with a form: Key Name, optional expiry date
3. On submit, calls `generateApiKey(clientId, name, expiresAt?)` server action
4. Server action returns `{ rawKey, keyPrefix }` — the raw key is **never stored**
5. Dialog transitions to a success state showing the full raw key in a read-only input with a "Copy" button
6. Warning message: "Store this key securely — it will not be shown again."
7. Close button dismisses the dialog

```ts
// Key generation in actions.ts
const rawKey = 'cms_live_' + randomBytes(32).toString('hex')
const keyHash = createHash('sha256').update(rawKey).digest('hex')
const keyPrefix = rawKey.slice(0, 16) + '...'

await prisma.clientApiKey.create({
  data: { clientId, name, keyHash, keyPrefix, expiresAt, createdById: session.id },
})

return { rawKey, keyPrefix }  // return rawKey ONCE
```

---

## API Keys Table

Columns:
- Name
- Prefix (`cms_live_a3f8...`)
- Scopes (badges)
- Last Used (relative time or "Never")
- Expires (date or "Never")
- Status (`Active` / `Revoked` / `Expired`)
- Actions: Revoke button (disabled if already revoked/expired)

Status badge logic:
- `revokedAt != null` → Revoked (red)
- `expiresAt != null && expiresAt < now` → Expired (gray)
- otherwise → Active (green)

---

## Revoke Flow

1. SUPER_ADMIN clicks "Revoke" on an active key
2. AlertDialog: "This will immediately invalidate this key. Any service using it will get 401 errors."
3. On confirm, calls `revokeApiKey(keyId)` server action
4. Table refreshes with updated status

---

## Acceptance Criteria

- [ ] "Generate New Key" dialog opens with name + expiry fields
- [ ] Raw key shown exactly once after generation, with copy button
- [ ] Warning displayed: key will not be shown again
- [ ] Keys table shows prefix, name, scopes, lastUsed, expiry, status
- [ ] Status badges correctly reflect active / revoked / expired states
- [ ] Revoking a key updates status immediately
- [ ] Revoked key returns 401 on next API call (tested via 00-04)
