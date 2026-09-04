import { authContract } from "@/modules/auth/contract";
import { businessesContract } from "@/modules/businesses/contract";
import { mastersContract } from "@/modules/masters/contract";
import { organizationsContract } from "@/modules/organizations/contract";
import { instrumentsContract } from "@/modules/instruments/contract";
import { filesContract } from "@/modules/files/contract";
import { applicationsContract } from "@/modules/applications/contract";
import { schedulingContract } from "@/modules/scheduling/contract";
import { inspectionsContract } from "@/modules/inspections/contract";
import { certificatesContract } from "@/modules/certificates/contract";
import { verificationContract } from "@/modules/verification/contract";
import { notificationsContract } from "@/modules/notifications/contract";
import { auditContract } from "@/modules/audit/contract";
import { dashboardContract } from "@/modules/dashboard/contract";

export const appContract = {
  auth: authContract,
  businesses: businessesContract,
  masters: mastersContract,
  organizations: organizationsContract,
  instruments: instrumentsContract,
  files: filesContract,
  applications: applicationsContract,
  scheduling: schedulingContract,
  inspections: inspectionsContract,
  certificates: certificatesContract,
  verification: verificationContract,
  notifications: notificationsContract,
  audit: auditContract,
  dashboard: dashboardContract,
};

export type AppContract = typeof appContract;
