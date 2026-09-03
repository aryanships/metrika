/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `dashboard` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/dashboard/server/service.ts` or procedures.
 */

export const dashboardRepository = {
  async aggregateRoleStats(role: string, scopeId?: string) {
    return {
      totalInstruments: 25,
      activeCertificates: 18,
      expiringCertificates: 4,
      expiredCertificates: 3,
      pendingApplications: 5,
      scheduledInspections: 2,
      completedInspections: 15,
    };
  },
};
