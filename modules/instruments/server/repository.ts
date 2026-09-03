/**
 * REPOSITORY BOUNDARY RULE:
 * This repository is strictly private to the `instruments` module.
 * Other modules MUST NEVER import this repository directly.
 * Instead, call the exposed methods in `modules/instruments/server/service.ts` or procedures.
 */

export interface InstrumentRecord {
  id: string;
  code: string;
  businessId: string;
  instrumentTypeId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: number;
  accuracyClass: string;
  purchaseDate: Date;
  stateId: string;
  districtId: string;
  tehsilId?: string | null;
  villageId?: string | null;
  status:
    | "REGISTERED"
    | "VERIFICATION_PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "EXPIRING_SOON"
    | "EXPIRED"
    | "DECOMMISSIONED";
  currentCertificateId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const instrumentsRepository = {
  async listInstruments() {
    return [];
  },

  async findById(id: string): Promise<InstrumentRecord | null> {
    return null;
  },

  async findBySerialNumber(manufacturer: string, serialNumber: string): Promise<InstrumentRecord | null> {
    return null;
  },

  async createInstrument(data: Omit<InstrumentRecord, "id" | "createdAt" | "updatedAt">): Promise<InstrumentRecord> {
    return {
      id: `inst_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
  },

  async updateInstrument(id: string, data: Partial<InstrumentRecord>): Promise<InstrumentRecord | null> {
    return null;
  },
};
