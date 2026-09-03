# Database Workflow Guide (Prisma 8 / Prisma Next)

This document describes the database and contract lifecycle for Digital Metrology with Prisma Next (Prisma 8) and PostgreSQL.

---

## 1. Core Architecture

In Prisma 8, the schema authored in `prisma/schema.prisma` is the canonical contract.
Two machine-readable artifacts are derived:
- `prisma/schema.json`: Runtime Intermediate Representation (IR) consumed by the query engine.
- `prisma/schema.d.ts`: Full TypeScript definitions and relation types.

The runtime entry point is `prisma/db.ts`, exporting `db` which provides typed access to `db.orm.<Model>` and `db.sql.<table>`.

---

## 2. Day-to-Day Development Workflow

### A. Editing the Contract
1. Edit `prisma/schema.prisma` to add/modify models, enums, fields, relations, or `@@check(...)` constraints.
2. Compile and emit the contract artifacts:
   ```bash
   bun run contract:emit
   ```
3. Run type checking to verify query signatures:
   ```bash
   bun x tsc --noEmit
   ```

### B. Applying Changes Locally
For rapid local development:
```bash
bun prisma db update
```
`db update` compares the contract with the live database and updates schema directly without requiring formal migration packages.

---

## 3. Formal Migration Workflow (Shared & Production Environments)

For shared branches, staging, and production:

### 1. Plan the Migration
Generate a versioned migration package under `migrations/app/<timestamp>_<slug>/`:
```bash
bun prisma migration plan --name <migration_name>
```

### 2. Inspect the Migration
Always review the planned operations before applying:
- `migrations/app/<timestamp>_<slug>/migration.json`: Metadata, from/to contract hashes.
- `migrations/app/<timestamp>_<slug>/ops.json`: Exact DDL operations planned.
- `migrations/app/<timestamp>_<slug>/migration.ts`: Migration TypeScript file (for custom data transforms if any).

### 3. Apply the Migration
Apply unapplied migrations to the target database:
```bash
bun prisma db migrate
```
Or against a specific database URL:
```bash
bun prisma db migrate --db $DATABASE_URL
```

### 4. Verify Database Integrity
Ensure the live database marker and schema match the current contract hash:
```bash
bun prisma db verify
```

---

## 4. Seeding the Database

Populate master data and demo accounts:
```bash
bun run db:seed
```
The seed script is idempotent and safe to run multiple times without creating duplicate records.
