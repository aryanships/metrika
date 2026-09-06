# Demo Scope

What the SIH internal-hackathon prototype does and does **not** do.

## In scope (P0)

- Email/password auth with HTTP-only session cookie, bcrypt hashing, RBAC.
- Instrument registration, digital passport, verification/re-verification
  applications, document screening, scheduling, officer/GATC assignment
  (recommendation engine + admin override), field inspection with a
  category-specific template + rules/tolerance engine, photo/video evidence,
  pass/fail, prototype certificate with QR + payload hash, public verification,
  expiry monitoring (manual sweep), audit trail, role dashboards.

## Out of scope (P0)

- Native Android/iOS apps; the field client is a mobile-responsive web page
  (no offline sync).
- Production digital signatures — the certificate is a **prototype/demo**
  record with a canonical-payload SHA-256 hash, not a qualified signature.
- Payments, payment status, or payment gateways.
- Aadhaar, SMS gateway, production government identity federation.
- Redis, BullMQ, background workers, email/SMS — expiry reminders run via the
  manual `scripts/expiry-sweep.ts`; production moves this to a worker.
- AI (OCR, nameplate detection), maps (Leaflet), and Recharts dashboards are P1.
- OpenAPI `/api/v1` public exposure, MFA, rate limiting, CSRF, malware scanning.

## Storage

- Production: Cloudflare R2 presigned upload/download.
- Development: local filesystem adapter (`STORAGE_DRIVER=local`) serving
  uploads via `/uploads`, so the full flow works without R2 credentials.
- Files are stored as object keys; only metadata lives in PostgreSQL.

## Certificate integrity (prototype)

1. Generate certificate data → deterministic canonical payload → SHA-256 hash →
   store hash → QR references the certificate ID → verify server-side.
2. The public page recomputes the hash from stored fields and flags
   `isHashVerified` / `tamperDetected`. This is a demo integrity mechanism, not
   a substitute for a government-qualified digital-signature infrastructure.
