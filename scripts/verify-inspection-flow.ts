import "dotenv/config";
import { db } from "../prisma/db";
import { inspectionsService } from "../modules/inspections/server/service";
import type { AppUser } from "../middleware/context";

async function main() {
  const lmoUser = await db.orm.public.User.where({ email: "lmo.verma@metrika.gov.in" }).first();
  if (!lmoUser) throw new Error("LMO user not found");

  const lmo: AppUser = {
    id: lmoUser.id,
    email: lmoUser.email,
    fullName: lmoUser.fullName,
    roles: ["LMO"],
    phone: lmoUser.phone,
    businessId: null,
    isActive: true,
  };

  const app = await db.orm.public.Application.first({ id: "3f42250e-d728-438a-8a95-96eb3b47509c" });
  console.log("Application status:", app?.status);

  const insp = await db.orm.public.Inspection.where({ applicationId: "3f42250e-d728-438a-8a95-96eb3b47509c" }).first();
  console.log("Inspection result:", insp?.result, "status:", insp?.status, "finalizedAt:", insp?.finalizedAt);

  const measurements = await db.orm.public.InspectionMeasurement.where({ inspectionId: insp?.id }).all();
  console.log("Measurements count:", measurements.length);
  for (const m of measurements) {
    console.log(`- ${m.label}: standard=${m.standardValue}, observed=${m.observedValue}, error=${m.observedError}, withinLimit=${m.withinLimit}`);
  }

  // Also test getting inspection via inspectionsService
  const inspectionOutput = await inspectionsService.get("3f42250e-d728-438a-8a95-96eb3b47509c", lmo);
  console.log("Fetched inspectionOutput:", {
    id: inspectionOutput.id,
    status: inspectionOutput.status,
    result: inspectionOutput.result,
    measurementsCount: inspectionOutput.measurements.length,
    evidenceComplete: inspectionOutput.evidence.complete,
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
