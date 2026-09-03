import { inspectionsRepository, InspectionRecord } from "./repository";
import {
  StartInspectionInput,
  GetInspectionInput,
  SaveDraftInspectionInput,
  SubmitInspectionInput,
  InspectionOutput,
} from "../schema";

function toSafeInspectionOutput(rec: InspectionRecord): InspectionOutput {
  return {
    id: rec.id,
    workOrderId: rec.workOrderId,
    applicationId: rec.applicationId,
    instrumentId: rec.instrumentId,
    performerId: rec.performerId,
    route: rec.route,
    templateId: rec.templateId ?? null,
    appliedRuleId: rec.appliedRuleId ?? null,
    checklistResponses: rec.checklistResponses,
    measurements: rec.measurements,
    result: rec.result,
    notes: rec.notes ?? null,
    finalizedAt: rec.finalizedAt ? rec.finalizedAt.toISOString() : null,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
  };
}

export const inspectionsService = {
  async start(input: StartInspectionInput, performerId = "usr_lmo_1"): Promise<InspectionOutput> {
    const created = await inspectionsRepository.create({
      workOrderId: input.workOrderId,
      applicationId: "app_demo_1",
      instrumentId: "inst_demo_1",
      performerId,
      route: "LMO",
      templateId: "tmpl_nawi_v1",
      appliedRuleId: "rule_nawi_class3",
      checklistResponses: {},
      measurements: [],
      result: "PENDING",
      notes: null,
      finalizedAt: null,
    });
    return toSafeInspectionOutput(created);
  },

  async get(input: GetInspectionInput): Promise<InspectionOutput> {
    const mock: InspectionRecord = {
      id: input.id,
      workOrderId: "wo_demo_1",
      applicationId: "app_demo_1",
      instrumentId: "inst_demo_1",
      performerId: "usr_lmo_1",
      route: "LMO",
      templateId: "tmpl_nawi_v1",
      appliedRuleId: "rule_nawi_class3",
      checklistResponses: { visualInspection: true, stampingAreaIntact: true },
      measurements: [
        {
          stepNumber: 1,
          appliedLoad: 10,
          indicatedLoad: 10.0005,
          observedError: 0.0005,
          permissibleError: 0.001,
          withinLimit: true,
        },
      ],
      result: "PASSED",
      notes: "Inspection completed satisfactorily",
      finalizedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return toSafeInspectionOutput(mock);
  },

  async saveDraft(input: SaveDraftInspectionInput): Promise<InspectionOutput> {
    const current = await this.get({ id: input.id });
    return {
      ...current,
      checklistResponses: input.checklistResponses ?? current.checklistResponses,
      measurements: input.measurements ?? current.measurements,
      notes: input.notes ?? current.notes,
      updatedAt: new Date().toISOString(),
    };
  },

  async submit(input: SubmitInspectionInput): Promise<InspectionOutput> {
    const allWithinLimits = input.measurements.every((m) => m.withinLimit);
    const result = allWithinLimits ? "PASSED" : "FAILED";

    const current = await this.get({ id: input.id });
    return {
      ...current,
      measurements: input.measurements,
      result,
      notes: input.notes ?? current.notes,
      finalizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};
