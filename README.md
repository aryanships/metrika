# Digital Metrology (e-MetVerify)

Online verification system for weighing & measuring instruments — a web platform
for digitizing the full lifecycle of a measuring instrument: registration →
verification application → document screening → scheduling → officer/GATC
assignment → field inspection → pass/fail → prototype digital certificate → QR
verification → expiry monitoring → re-verification.

Built as a demonstration prototype (SIH internal hackathon). Certificates are
prototype/demo records, not legally issued government certificates.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **oRPC v2** (contract-first) served inside Next.js at `/rpc`; the same
  contract is exposed as REST/OpenAPI at `/api`
- **Prisma 8 (Prisma Next)** data contract + PostgreSQL
- **shadcn/ui** (Base UI + Tailwind v4), **React Hook Form** + **Zod**,
  **TanStack Query**
- Object storage: Cloudflare **R2** (production) or a local filesystem adapter
  (development)

## Setup

```bash
bun install
cp .env.example .env      # fill in DATABASE_URL + AUTH_SECRET (R2 optional)
bun run contract:emit     # emit the Prisma data contract
bun prisma db update      # apply the schema to PostgreSQL
bun run db:seed           # idempotent demo data
bun run dev               # http://localhost:3000
```

Required env vars: `DATABASE_URL`, `AUTH_SECRET`. R2 vars are optional in
development — uploads fall back to the local filesystem adapter
(`STORAGE_DRIVER=local`, served via `/uploads`) when they are unset.

## Roles

| Role | Home route | Notes |
| --- | --- | --- |
| Instrument Owner / Business | `/owner` | self-registers, registers instruments, applies, tracks certificates |
| LMO | `/field` | conducts field verification |
| GATC manager / operator | `/field` | centre-scoped authority (no global role) |
| State / District Admin | `/admin` | reviews, assigns, schedules, issues |
| System Admin | `/system` | master data + platform admin |
| Public | `/verify` | certificate search / QR verification |

## Demo credentials

All demo accounts use password **`Demo1234!`** (see `docs/demo-runbook.md` for
the full list).

| Role | Email |
| --- | --- |
| Instrument owner | `owner.reliance@retail.in` |
| State admin | `stateadmin.mh@metrika.gov.in` |
| System admin | `admin@metrika.gov.in` |
| LMO | `lmo.sharma@metrika.gov.in` |
| GATC manager | `manager.apex@gatc.org` |

## Verification

```bash
bun x tsc --noEmit    # typecheck
bun run lint          # eslint (zero errors)
bun run scripts/lifecycle-e2e.ts        # owner → certificate → re-verification
bun run scripts/applications-selfcheck.ts
bun run scripts/certificates-selfcheck.ts
```

See `docs/demo-runbook.md` for the end-to-end demo flow and
`docs/demo-scope.md` for the prototype boundaries.
