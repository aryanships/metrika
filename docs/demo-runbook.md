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
| Instrument owner | `owner.bigbazaar@retail.in` | Big Bazaar Jankipuram (Lucknow) |
| Instrument owner | `owner.iocl@petro.in` | IOCL Fuel Station Aliganj (Lucknow) |
| State admin | `stateadmin.up@metrika.gov.in` | Uttar Pradesh scope |
| District admin | `distadmin.lucknow@metrika.gov.in` | Lucknow scope |
| System admin | `admin@metrika.gov.in` | Full audit / master data |
| LMO | `lmo.verma@metrika.gov.in` | LMO-UP-001, Lucknow, EWB/FDP expertise |
| LMO | `lmo.gupta@metrika.gov.in` | LMO-UP-002, Lucknow, WBR/EWB expertise |
| GATC manager | `manager.avadh@gatc.org` | Avadh Testing & Calibration, Lucknow |

## 3. Feature route list

| Route | Who | What |
| --- | --- | --- |
| `/login` | public | Email/password sign-in |
| `/verify` | public | Certificate/instrument search |
| `/verify/c/[code]` | public | QR destination: safe verification result |
| `/cert/[code]` | public | Public certificate view (printable) |
| `/cert/[code]/pdf` | public | On-demand PDF download |
| `/business` | owner | Dashboard: statuses, appointments, notifications, re-verification CTA |
| `/business/profile` | owner | Business profile |
| `/business/instruments` | owner | Instrument registry |
| `/business/instruments/new` | owner | Register instrument |
| `/business/instruments/[id]` | owner | Digital passport: overview + certificate/application history |
| `/business/certificates` | owner | Certificate list |
| `/business/certificates/[id]` | owner | Certificate + QR + print/PDF |
| `/field` | LMO / GATC staff | Assigned / today / pending work |
| `/admin` | state/district/system admin | Applications, certificates, districts, workload |
| `/admin/audit` | admins | Append-only audit trail |

## 4. The PRD 19-step judge flow

| Step | Action | Login | Route |
| --- | --- | --- | --- |
| 1 | Business logs in | owner | `/login` → `/business` |
| 2 | Registers an electronic weighing machine | owner | `/business/instruments/new` |
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
| 17 | Show instrument passport | owner | `/business/instruments/[id]` |
| 18 | Show certificate approaching expiry | owner | `/business` notifications |
| 19 | Click re-verification | owner | re-verification CTA → new application |

## 4a. Streamlined demo path (≤ 4 minutes)

The product now guides every actor to a single next action. Follow one thread:

1. **Landing** — narrate the "Register → Apply → Screen → Schedule → Verify → Certify → QR → Renew" lifecycle strip.
2. **Owner login** (`owner.bigbazaar@retail.in`, 1-click shortcut).
3. **Owner dashboard** — highlighted "next step" card + lifecycle stepper. Click **Register instrument**.
4. **Register** — short form; the success screen offers **Submit verification application**.
5. **Apply** — type/instrument preselected, evidence already attached → **Submit**. The detail page shows a "what happens next" stepper.
6. **Admin login** (`stateadmin.up@metrika.gov.in`) — dashboard flags "N applications awaiting review". Open the application: **Start review → Approve → Assign → Confirm schedule** on one page with a stepper.
7. **LMO login** (`lmo.verma@metrika.gov.in`) — dashboard card has a one-click **Start**. Record measurements → **Submit** (PASS).
8. **Issue certificate** — from the PASSED application (admin or field), one click **Issue certificate** → **View public certificate**.
9. **Public** — `/cert/[code]` shows a printable certificate with **Download PDF**; scan the QR to `/verify/c/[code]`.
10. **Owner** — dashboard now shows the active certificate and re-verification CTA.

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

- Certificate PDF is generated on demand (`/cert/[code]/pdf`) from the live record;
  `Certificate.fileId` stays null (no binary artifact stored in R2/local).
- Re-verification / transfer / correction reuse `applications.createDraft` + completeness validation.
- Maps (Leaflet), recommendation visualization, and Recharts dashboards are P1 and not yet wired.
- The expiry sweep is a manual script; production moves it to a scheduled worker.
