import { authRouter } from "@/modules/auth/server/router";
import { businessesRouter } from "@/modules/businesses/server/router";
import { mastersRouter } from "@/modules/masters/server/router";
import { organizationsRouter } from "@/modules/organizations/server/router";
import { instrumentsRouter } from "@/modules/instruments/server/router";
import { filesRouter } from "@/modules/files/server/router";
import { applicationsRouter } from "@/modules/applications/server/router";
import { schedulingRouter } from "@/modules/scheduling/server/router";
import { inspectionsRouter } from "@/modules/inspections/server/router";
import { certificatesRouter } from "@/modules/certificates/server/router";
import { verificationRouter } from "@/modules/verification/server/router";
import { notificationsRouter } from "@/modules/notifications/server/router";
import { auditRouter } from "@/modules/audit/server/router";
import { dashboardRouter } from "@/modules/dashboard/server/router";

export const router = {
  auth: authRouter,
  businesses: businessesRouter,
  masters: mastersRouter,
  organizations: organizationsRouter,
  instruments: instrumentsRouter,
  files: filesRouter,
  applications: applicationsRouter,
  scheduling: schedulingRouter,
  inspections: inspectionsRouter,
  certificates: certificatesRouter,
  verification: verificationRouter,
  notifications: notificationsRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
};

export type AppRouter = typeof router;