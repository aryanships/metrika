import { instrumentsRepository, InstrumentRecord } from "./repository";
import {
  ListInstrumentsInput,
  ListInstrumentsOutput,
  CreateInstrumentInput,
  UpdateInstrumentInput,
  GetInstrumentInput,
  InstrumentOutput,
  InstrumentPassportOutput,
} from "../schema";

function toSafeInstrumentOutput(rec: InstrumentRecord): InstrumentOutput {
  return {
    id: rec.id,
    code: rec.code,
    businessId: rec.businessId,
    instrumentTypeId: rec.instrumentTypeId,
    manufacturer: rec.manufacturer,
    model: rec.model,
    serialNumber: rec.serialNumber,
    capacity: rec.capacity,
    accuracyClass: rec.accuracyClass,
    purchaseDate: rec.purchaseDate.toISOString(),
    stateId: rec.stateId,
    districtId: rec.districtId,
    tehsilId: rec.tehsilId ?? null,
    villageId: rec.villageId ?? null,
    status: rec.status,
    currentCertificateId: rec.currentCertificateId ?? null,
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
  };
}

export const instrumentsService = {
  async list(input: ListInstrumentsInput): Promise<ListInstrumentsOutput> {
    const mock: InstrumentRecord = {
      id: "inst_demo_1",
      code: "IND-DL-NAWI-2024-0089",
      businessId: "biz_demo",
      instrumentTypeId: "it_weighing_scale",
      manufacturer: "Essae-Teraoka",
      model: "DS-215",
      serialNumber: "SN-9841203",
      capacity: 30,
      accuracyClass: "Class III",
      purchaseDate: new Date("2023-05-15"),
      stateId: "unit_demo_state",
      districtId: "unit_demo_dist",
      status: "VERIFIED",
      currentCertificateId: "cert_demo_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      items: [toSafeInstrumentOutput(mock)],
      pagination: {
        page: input.page ?? 1,
        limit: input.limit ?? 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
        nextCursor: null,
      },
    };
  },

  async get(input: GetInstrumentInput): Promise<InstrumentOutput> {
    const mock: InstrumentRecord = {
      id: input.id,
      code: "IND-DL-NAWI-2024-0089",
      businessId: "biz_demo",
      instrumentTypeId: "it_weighing_scale",
      manufacturer: "Essae-Teraoka",
      model: "DS-215",
      serialNumber: "SN-9841203",
      capacity: 30,
      accuracyClass: "Class III",
      purchaseDate: new Date("2023-05-15"),
      stateId: "unit_demo_state",
      districtId: "unit_demo_dist",
      status: "VERIFIED",
      currentCertificateId: "cert_demo_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return toSafeInstrumentOutput(mock);
  },

  async create(input: CreateInstrumentInput, businessId = "biz_demo"): Promise<InstrumentOutput> {
    const code = `IND-${input.stateId}-${Date.now().toString().slice(-6)}`;
    const created = await instrumentsRepository.createInstrument({
      code,
      businessId,
      instrumentTypeId: input.instrumentTypeId,
      manufacturer: input.manufacturer,
      model: input.model,
      serialNumber: input.serialNumber,
      capacity: input.capacity,
      accuracyClass: input.accuracyClass,
      purchaseDate: new Date(input.purchaseDate),
      stateId: input.stateId,
      districtId: input.districtId,
      tehsilId: input.tehsilId ?? null,
      villageId: input.villageId ?? null,
      status: "REGISTERED",
      currentCertificateId: null,
    });
    return toSafeInstrumentOutput(created);
  },

  async update(input: UpdateInstrumentInput): Promise<InstrumentOutput> {
    const mock: InstrumentRecord = {
      id: input.id,
      code: "IND-DL-NAWI-2024-0089",
      businessId: "biz_demo",
      instrumentTypeId: "it_weighing_scale",
      manufacturer: "Essae-Teraoka",
      model: input.model ?? "DS-215",
      serialNumber: "SN-9841203",
      capacity: 30,
      accuracyClass: "Class III",
      purchaseDate: new Date("2023-05-15"),
      stateId: "unit_demo_state",
      districtId: "unit_demo_dist",
      tehsilId: input.tehsilId ?? null,
      villageId: input.villageId ?? null,
      status: "VERIFIED",
      currentCertificateId: "cert_demo_1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return toSafeInstrumentOutput(mock);
  },

  async passport(input: GetInstrumentInput): Promise<InstrumentPassportOutput> {
    const instrument = await this.get(input);
    return {
      instrument,
      activeCertificate: {
        id: "cert_demo_1",
        certificateCode: "CERT-DL-2024-0042",
        validFrom: new Date("2024-01-10").toISOString(),
        validUntil: new Date("2025-01-09").toISOString(),
        status: "ACTIVE",
        issuingAuthority: "Legal Metrology Department, Delhi",
        qrUrl: `/verify/c/CERT-DL-2024-0042`,
      },
      applicationsCount: 1,
      inspectionsCount: 1,
      certificatesCount: 1,
    };
  },
};
