import "dotenv/config";
import { db } from "../prisma/db";

/**
 * Prototype expiry sweep (10.2). Idempotent, manually invoked:
 *   bun run scripts/expiry-sweep.ts
 *
 * Transitions certificate status (EXPIRING_SOON within 30 days, EXPIRED past
 * validUntil), appends CertificateStatusHistory, and inserts deduplicated
 * in-app notifications at 90/60/30 days and on/after expiry. In production this
 * becomes a scheduled worker.
 */

const orm = db.orm.public;

const REMINDERS = [
  { days: 90, event: "CERTIFICATE_EXPIRING_90" },
  { days: 60, event: "CERTIFICATE_EXPIRING_60" },
  { days: 30, event: "CERTIFICATE_EXPIRING_30" },
] as const;

function messageFor(event: string, certificateCode: string, instrumentCode: string, daysLeft: number): string {
  const when = new Date(Date.now() + daysLeft * 86400000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (event === "CERTIFICATE_EXPIRED") {
    return `Certificate ${certificateCode} for ${instrumentCode} has expired. Apply for re-verification.`;
  }
  return `Certificate ${certificateCode} for ${instrumentCode} expires on ${when}. Apply for re-verification to stay compliant.`;
}

async function main(): Promise<void> {
  const now = Date.now();
  const certificates = await orm.Certificate
    .where((c) => c.status.in(["ACTIVE", "EXPIRING_SOON"]))
    .all();

  let updated = 0;
  let notified = 0;

  for (const cert of certificates) {
    const instrument = await orm.Instrument.first({ id: cert.instrumentId });
    if (!instrument) continue;
    const business = await orm.Business.first({ id: instrument.businessId });
    if (!business) continue;

    const daysLeft = Math.ceil((Date.parse(cert.validUntil) - now) / 86400000);

    let nextStatus: string | null = null;
    if (daysLeft < 0 && cert.status !== "EXPIRED") nextStatus = "EXPIRED";
    else if (daysLeft >= 0 && daysLeft <= 30 && cert.status !== "EXPIRING_SOON") nextStatus = "EXPIRING_SOON";

    if (nextStatus) {
      await orm.Certificate.where({ id: cert.id }).update({ status: nextStatus as never });
      await orm.CertificateStatusHistory.create({
        certificateId: cert.id,
        fromStatus: cert.status,
        toStatus: nextStatus as never,
        changedById: null,
        reason: "Expiry sweep",
      });
      updated++;
    }

    const events = daysLeft < 0
      ? ["CERTIFICATE_EXPIRED"]
      : REMINDERS.filter((r) => daysLeft <= r.days).map((r) => r.event);

    for (const event of events) {
      const existing = await orm.Notification.where({
        userId: business.userId,
        certificateId: cert.id,
        event,
      }).first();
      if (existing) continue;

      await orm.Notification.create({
        userId: business.userId,
        certificateId: cert.id,
        channel: "IN_APP",
        event,
        payload: {
          title: event === "CERTIFICATE_EXPIRED" ? "Certificate expired" : "Certificate expiring soon",
          message: messageFor(event, cert.certificateCode, instrument.instrumentCode, daysLeft),
        },
        status: "SENT",
        sentAt: new Date().toISOString(),
      });
      notified++;
    }
  }

  console.log(`Expiry sweep complete: ${updated} certificate(s) updated, ${notified} notification(s) created.`);
}

main()
  .catch((error) => {
    console.error("Expiry sweep failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
