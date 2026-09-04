# Digital Metrology — Demo Runbook

This is the operator's guide for resetting, seeding, and running the SIH demo end to end.

## 1. Reset & seed

```bash
# Emit the Prisma contract (after any schema change)
bun run contract:emit

# Apply schema changes to the target database
bun prisma db update

# Seed idempotently (safe to re-run; no duplicate records)
bun run db:seed
```

The seed creates: 5 businesses, 20 instruments, 15 applications, 6 LMOs, 3 GATCs,
10 certificates (3 expired, 4 expiring soon, 3 active), plus master data, rules, and templates.

> Note: `db:seed` was updated so GATC staff carry **only** centre-scoped authority
> (`GatcMembership`), never a global admin role. Re-run it once if you seeded from an
> older revision that granted GATC staff `SYSTEM_ADMIN`.

## 2. Demo credentials

All accounts share the password **`Demo1234!`**.

| Role | Email | Notes |
| --- | --- | --- |
| Instrument owner | `owner.reliance@retail.in` | Reliance Fresh Superstores (Pune) |
| Instrument owner | `owner.bpcl@petro.in` | BPCL Fuel Oasis (Pune) |
| State admin | `stateadmin.mh@metrika.gov.in` | Maharashtra scope |
| District admin | `distadmin.pune@metrika.gov.in` | Pune scope |
| System admin | `admin@metrika.gov.in` | Full audit / master data |
| LMO | `lmo.sharma@metrika.gov.in` | LMO-MH-001, Pune, EWB/FDP expertise |
| GATC manager | `manager.apex@gatc.org` | Apex Metrology & Calibration Labs |

## 3. Feature route list

| Route | Who | What |
| --- | --- | --- |
| `/login` | public | Email/password sign-in |
| `/verify` | public | Certificate/instrument search |
| `/verify/c/[code]` | public | QR destination: safe verification result |
| `/owner` | owner | Dashboard: statuses, appointments, notifications, re-verification CTA |
| `/owner/profile` | owner | Business profile |
| `/owner/instruments` | owner | Instrument registry |
| `/owner/instruments/new` | owner | Register instrument |
| `/owner/instruments/[id]` | owner | Digital passport: overview + certificate/application history |
| `/owner/certificates` | owner | Certificate list |
| `/owner/certificates/[id]` | owner | Certificate + QR + print |
| `/field` | LMO / GATC staff | Assigned / today / pending work |
| `/admin` | state/district/system admin | Applications, certificates, districts, workload |
| `/admin/audit` | admins | Append-only audit trail |

## 4. The PRD 19-step judge flow

| Step | Action | Login | Route |
| --- | --- | --- | --- |
| 1 | Business logs in | owner | `/login` → `/owner` |
| 2 | Registers an electronic weighing machine | owner | `/owner/instruments/new` |
| 3 | Uploads documents | owner | instrument detail → upload |
| 4 | Submits verification application | owner | application wizard |
| 5 | Admin receives application | state admin | `/admin` |
| 6 | System recommends an LMO | state admin | scheduling recommend |
| 7 | Admin schedules verification | state admin | scheduling assign + schedule |
| 8 | LMO opens field interface | LMO | `/field` |
| 9 | LMO starts verification | LMO | inspection start |
| 10 | LMO records measurements | LMO | inspection draft |
| 11 | System calculates result | — | rules engine (server-side) |
| 12 | LMO uploads photos | LMO | inspection evidence |
| 13 | Verification passes | LMO | inspection submit |
| 14 | Certificate generated | admin/LMO | `certificates.issue` |
| 15 | Judge scans QR | public | certificate page QR |
| 16 | Public verification confirms authenticity | public | `/verify/c/[code]` |
| 17 | Show instrument passport | owner | `/owner/instruments/[id]` |
| 18 | Show certificate approaching expiry | owner | `/owner` notifications |
| 19 | Click re-verification | owner | re-verification CTA → new application |

## 5. Automated checks

```bash
bun run scripts/applications-selfcheck.ts   # workflow state machine + review
bun run scripts/certificates-selfcheck.ts   # hashing, issuance, public safety
bun run scripts/files-selfcheck.ts          # upload policy (if R2 configured)
bun run scripts/lifecycle-e2e.ts            # full owner→certificate→re-verification flow
bun run scripts/expiry-sweep.ts             # certificate status + notifications
```

## 6. Regression test matrix

| Area | Check | Coverage |
| --- | --- | --- |
| RBAC / IDOR | Cross-owner & cross-scope denial | applications & certificates selfchecks |
| Workflow states | Every legal + forbidden transition | applications selfcheck + state-machine |
| Rule engine | Tolerance math, PASS/FAIL | rules-engine (used by lifecycle e2e) |
| Certificate hashing | Determinism, tamper sensitivity | certificates selfcheck |
| Public exposure | No phone/email/address in verify payload | certificates selfcheck |
| Duplicate issuance | Rejected (explicit + DB unique) | certificates selfcheck |
| Issuance gate | Only after `PASSED` | certificates selfcheck |
| Expiry | Status transitions + dedup notifications | expiry sweep (idempotent re-run) |

## 7. Known prototype boundaries

- Certificate is a printable HTML page (no binary PDF/R2 round-trip); `Certificate.fileId` stays null.
- Re-verification / transfer / correction reuse `applications.createDraft` + completeness validation.
- Maps (Leaflet), recommendation visualization, and Recharts dashboards are P1 and not yet wired.
- The expiry sweep is a manual script; production moves it to a scheduled worker.
