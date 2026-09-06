import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './db';
import { buildCanonicalPayload, hashPayload } from '../modules/certificates/server/payload';

const orm = db.orm.public;

const DEMO_PASSWORD = 'Demo1234!';
const PASSWORD_HASH = await bcrypt.hash(DEMO_PASSWORD, 10);

async function getOrCreateUser(data: {
  email: string;
  fullName: string;
  phone?: string;
  role: 'SYSTEM_ADMIN' | 'STATE_ADMIN' | 'DISTRICT_ADMIN' | 'DEPARTMENT_OFFICIAL' | 'LMO' | 'INSTRUMENT_OWNER';
}) {
  let user = await orm.User.where({ email: data.email }).first();
  if (!user) {
    user = await orm.User.create({
      email: data.email,
      fullName: data.fullName,
      phone: data.phone ?? '+919876543210',
      passwordHash: PASSWORD_HASH,
      isActive: true,
    });
  } else if (!user.passwordHash || !(await bcrypt.compare(DEMO_PASSWORD, user.passwordHash))) {
    await orm.User.where({ id: user.id }).update({ passwordHash: PASSWORD_HASH });
  }

  const existingRole = await orm.UserRole.where({ userId: user.id, role: data.role }).first();
  if (!existingRole) {
    await orm.UserRole.create({
      userId: user.id,
      role: data.role,
    });
  }

  return user;
}

// GATC staff carry centre-scoped authority (GatcMembership) only — never a
// global role. Clears any previously-seeded global role for the same login.
async function getOrCreateStaffUser(data: { email: string; fullName: string }) {
  let user = await orm.User.where({ email: data.email }).first();
  if (!user) {
    user = await orm.User.create({
      email: data.email,
      fullName: data.fullName,
      phone: '+919876543210',
      passwordHash: PASSWORD_HASH,
      isActive: true,
    });
  }
  await orm.UserRole.where({ userId: user.id }).delete();
  return user;
}

async function getOrCreateAdminUnit(data: {
  name: string;
  type: 'STATE' | 'DISTRICT' | 'TEHSIL' | 'VILLAGE';
  parentId: string | null;
  latitude?: number;
  longitude?: number;
}) {
  let unit = await orm.AdministrativeUnit
    .where({ name: data.name, type: data.type, parentId: data.parentId })
    .first();

  if (!unit) {
    unit = await orm.AdministrativeUnit.create({
      name: data.name,
      type: data.type,
      parentId: data.parentId,
      latitude: data.latitude ? String(data.latitude) : null,
      longitude: data.longitude ? String(data.longitude) : null,
    });
  }
  return unit;
}

async function getOrCreateInstrumentType(data: {
  code: string;
  name: string;
  unit: string;
}) {
  let item = await orm.InstrumentType.where({ code: data.code }).first();
  if (!item) {
    item = await orm.InstrumentType.create({
      code: data.code,
      name: data.name,
      unit: data.unit,
    });
  }
  return item;
}

export async function main() {
  console.log('🌱 Starting Digital Metrology database seed...');

  // 1. Administrative Units (Geography)
  console.log('📍 Seeding administrative hierarchy (Maharashtra)...');
  const mhState = await getOrCreateAdminUnit({
    name: 'Maharashtra',
    type: 'STATE',
    parentId: null,
    latitude: 19.7515,
    longitude: 75.7139,
  });

  const puneDist = await getOrCreateAdminUnit({
    name: 'Pune',
    type: 'DISTRICT',
    parentId: mhState.id,
    latitude: 18.5204,
    longitude: 73.8567,
  });

  const mumbaiDist = await getOrCreateAdminUnit({
    name: 'Mumbai',
    type: 'DISTRICT',
    parentId: mhState.id,
    latitude: 19.0760,
    longitude: 72.8777,
  });

  const nagpurDist = await getOrCreateAdminUnit({
    name: 'Nagpur',
    type: 'DISTRICT',
    parentId: mhState.id,
    latitude: 21.1458,
    longitude: 79.0882,
  });

  const haveliTehsil = await getOrCreateAdminUnit({
    name: 'Haveli',
    type: 'TEHSIL',
    parentId: puneDist.id,
    latitude: 18.4900,
    longitude: 73.8800,
  });

  const andheriTehsil = await getOrCreateAdminUnit({
    name: 'Andheri',
    type: 'TEHSIL',
    parentId: mumbaiDist.id,
    latitude: 19.1136,
    longitude: 72.8697,
  });

  const nagpurUrbanTehsil = await getOrCreateAdminUnit({
    name: 'Nagpur Urban',
    type: 'TEHSIL',
    parentId: nagpurDist.id,
    latitude: 21.1500,
    longitude: 79.0900,
  });

  const hinjewadiVillage = await getOrCreateAdminUnit({
    name: 'Hinjewadi',
    type: 'VILLAGE',
    parentId: haveliTehsil.id,
    latitude: 18.5913,
    longitude: 73.7389,
  });

  const bandraVillage = await getOrCreateAdminUnit({
    name: 'Bandra West',
    type: 'VILLAGE',
    parentId: andheriTehsil.id,
    latitude: 19.0596,
    longitude: 72.8295,
  });

  const dharampethVillage = await getOrCreateAdminUnit({
    name: 'Dharampeth',
    type: 'VILLAGE',
    parentId: nagpurUrbanTehsil.id,
    latitude: 21.1420,
    longitude: 79.0650,
  });

  // 2. Instrument Types
  console.log('⚖️ Seeding instrument master types...');
  const ewbType = await getOrCreateInstrumentType({
    code: 'EWB-01',
    name: 'Electronic Weighing Balance',
    unit: 'kg',
  });

  const fdpType = await getOrCreateInstrumentType({
    code: 'FDP-01',
    name: 'Fuel Dispenser Pump',
    unit: 'litre',
  });

  const wbrType = await getOrCreateInstrumentType({
    code: 'WBR-01',
    name: 'Heavy Industrial Weighbridge',
    unit: 'tonne',
  });

  const astType = await getOrCreateInstrumentType({
    code: 'AST-01',
    name: 'Aboveground Petroleum Storage Tank',
    unit: 'kL',
  });

  const pwbType = await getOrCreateInstrumentType({
    code: 'PWB-01',
    name: 'High Precision Bullion Balance',
    unit: 'g',
  });

  // 3. Regulatory Rules (Tolerances / Periods)
  console.log('📜 Seeding regulatory rules...');
  const rules = [
    {
      typeId: ewbType.id,
      accuracyClass: 'Class II',
      min: '0.001',
      max: '10.0',
      mpe: '0.05',
      months: 12,
    },
    {
      typeId: ewbType.id,
      accuracyClass: 'Class III',
      min: '1.0',
      max: '150.0',
      mpe: '10.0',
      months: 12,
    },
    {
      typeId: fdpType.id,
      accuracyClass: 'Class 0.5',
      min: '0.5',
      max: '5000.0',
      mpe: '0.05',
      months: 12,
    },
    {
      typeId: wbrType.id,
      accuracyClass: 'Class III',
      min: '1.0',
      max: '100.0',
      mpe: '10.0',
      months: 24,
    },
    {
      typeId: astType.id,
      accuracyClass: 'Class 0.2',
      min: '10.0',
      max: '1000.0',
      mpe: '50.0',
      months: 60,
    },
  ];

  const seededRules: NonNullable<Awaited<ReturnType<typeof orm.RegulatoryRule["first"]>>>[] = [];
  for (const r of rules) {
    let rule = await orm.RegulatoryRule
      .where({ instrumentTypeId: r.typeId, accuracyClass: r.accuracyClass })
      .first();
    if (!rule) {
      rule = await orm.RegulatoryRule.create({
        instrumentTypeId: r.typeId,
        accuracyClass: r.accuracyClass,
        capacityMin: r.min,
        capacityMax: r.max,
        permissibleError: r.mpe,
        verificationPeriodMonths: r.months,
        effectiveFrom: '2023-01-01T00:00:00.000Z',
      });
    }
    seededRules.push(rule);
  }

  // 4. Inspection Templates
  console.log('📋 Seeding inspection templates and items...');
  let ewbTemplate = await orm.InspectionTemplate
    .where({ instrumentTypeId: ewbType.id, code: 'TPL-EWB-01', version: 1 })
    .first();
  if (!ewbTemplate) {
    ewbTemplate = await orm.InspectionTemplate.create({
      instrumentTypeId: ewbType.id,
      code: 'TPL-EWB-01',
      name: 'Standard Electronic Weighing Balance Inspection',
      version: 1,
      effectiveFrom: '2023-01-01T00:00:00.000Z',
      isActive: true,
    });

    const ewbItems = [
      { code: 'ITEM-ZERO', label: 'Zero Load Error Check', kind: 'NUMERIC' as const, unit: 'kg', order: 1 },
      { code: 'ITEM-ECCENTRIC', label: 'Eccentricity (Corner Load) Test', kind: 'CHECKLIST' as const, unit: null, order: 2 },
      { code: 'ITEM-MAXCAP', label: 'Max Capacity Indication Accuracy', kind: 'NUMERIC' as const, unit: 'kg', order: 3 },
      { code: 'ITEM-STAMP', label: 'Verification Stamp & Plaque Intact', kind: 'CHECKLIST' as const, unit: null, order: 4 },
    ];
    for (const it of ewbItems) {
      await orm.InspectionTemplateItem.create({
        templateId: ewbTemplate.id,
        code: it.code,
        label: it.label,
        kind: it.kind,
        unit: it.unit,
        isRequired: true,
        displayOrder: it.order,
      });
    }
  }

  let fdpTemplate = await orm.InspectionTemplate
    .where({ instrumentTypeId: fdpType.id, code: 'TPL-FDP-01', version: 1 })
    .first();
  if (!fdpTemplate) {
    fdpTemplate = await orm.InspectionTemplate.create({
      instrumentTypeId: fdpType.id,
      code: 'TPL-FDP-01',
      name: 'Fuel Dispensing Unit Accuracy Inspection',
      version: 1,
      effectiveFrom: '2023-01-01T00:00:00.000Z',
      isActive: true,
    });

    const fdpItems = [
      { code: 'ITEM-MAXFLOW', label: 'Delivery Accuracy at Maximum Flow Rate', kind: 'NUMERIC' as const, unit: 'litre', order: 1 },
      { code: 'ITEM-MINFLOW', label: 'Delivery Accuracy at Minimum Flow Rate', kind: 'NUMERIC' as const, unit: 'litre', order: 2 },
      { code: 'ITEM-ANTIDRAIN', label: 'Anti-drain Valve Operation', kind: 'CHECKLIST' as const, unit: null, order: 3 },
      { code: 'ITEM-TOTALIZER', label: 'Totalizer Reading Verification', kind: 'CHECKLIST' as const, unit: null, order: 4 },
    ];
    for (const it of fdpItems) {
      await orm.InspectionTemplateItem.create({
        templateId: fdpTemplate.id,
        code: it.code,
        label: it.label,
        kind: it.kind,
        unit: it.unit,
        isRequired: true,
        displayOrder: it.order,
      });
    }
  }

  // 5. Administrators & Officials
  console.log('👤 Seeding administrators and officials...');
  const sysAdmin = await getOrCreateUser({
    email: 'admin@metrika.gov.in',
    fullName: 'System Administrator',
    phone: '+919800000001',
    role: 'SYSTEM_ADMIN',
  });

  const stateAdmin = await getOrCreateUser({
    email: 'stateadmin.mh@metrika.gov.in',
    fullName: 'Dr. Sanjay Deshmukh (State Controller)',
    phone: '+919800000002',
    role: 'STATE_ADMIN',
  });
  const stateScope = await orm.AdminScope.where({ userId: stateAdmin.id, administrativeUnitId: mhState.id }).first();
  if (!stateScope) {
    await orm.AdminScope.create({ userId: stateAdmin.id, administrativeUnitId: mhState.id });
  }

  const distAdminPune = await getOrCreateUser({
    email: 'distadmin.pune@metrika.gov.in',
    fullName: 'Anil Kulkarni (Dy. Controller Pune)',
    phone: '+919800000003',
    role: 'DISTRICT_ADMIN',
  });
  const puneScope = await orm.AdminScope.where({ userId: distAdminPune.id, administrativeUnitId: puneDist.id }).first();
  if (!puneScope) {
    await orm.AdminScope.create({ userId: distAdminPune.id, administrativeUnitId: puneDist.id });
  }

  const distAdminMumbai = await getOrCreateUser({
    email: 'distadmin.mumbai@metrika.gov.in',
    fullName: 'Meera Sengupta (Dy. Controller Mumbai)',
    phone: '+919800000004',
    role: 'DISTRICT_ADMIN',
  });
  const mumbaiScope = await orm.AdminScope.where({ userId: distAdminMumbai.id, administrativeUnitId: mumbaiDist.id }).first();
  if (!mumbaiScope) {
    await orm.AdminScope.create({ userId: distAdminMumbai.id, administrativeUnitId: mumbaiDist.id });
  }

  await getOrCreateUser({
    email: 'dept.hq@metrika.gov.in',
    fullName: 'National Legal Metrology Directorate Official',
    phone: '+919800000005',
    role: 'DEPARTMENT_OFFICIAL',
  });

  // 6. LMOs (Legal Metrology Officers - Exactly 6)
  console.log('👮 Seeding 6 Legal Metrology Officers (LMOs)...');
  const lmoSpecs = [
    { email: 'lmo.sharma@metrika.gov.in', name: 'Rajesh Sharma', empId: 'LMO-MH-001', base: puneDist.id, types: [ewbType.id, fdpType.id], juris: [puneDist.id, haveliTehsil.id] },
    { email: 'lmo.patil@metrika.gov.in', name: 'Priya Patil', empId: 'LMO-MH-002', base: puneDist.id, types: [wbrType.id, ewbType.id], juris: [puneDist.id] },
    { email: 'lmo.kulkarni@metrika.gov.in', name: 'Amit Kulkarni', empId: 'LMO-MH-003', base: mumbaiDist.id, types: [fdpType.id, astType.id], juris: [mumbaiDist.id, andheriTehsil.id] },
    { email: 'lmo.deshmukh@metrika.gov.in', name: 'Sunita Deshmukh', empId: 'LMO-MH-004', base: mumbaiDist.id, types: [ewbType.id, pwbType.id], juris: [mumbaiDist.id] },
    { email: 'lmo.shinde@metrika.gov.in', name: 'Vikas Shinde', empId: 'LMO-MH-005', base: nagpurDist.id, types: [wbrType.id, ewbType.id], juris: [nagpurDist.id, nagpurUrbanTehsil.id] },
    { email: 'lmo.joshi@metrika.gov.in', name: 'Sneha Joshi', empId: 'LMO-MH-006', base: nagpurDist.id, types: [fdpType.id, ewbType.id], juris: [nagpurDist.id] },
  ];

  const seededLmos = [];
  for (const s of lmoSpecs) {
    const user = await getOrCreateUser({
      email: s.email,
      fullName: s.name,
      role: 'LMO',
    });

    let lmo = await orm.Lmo.where({ userId: user.id }).first();
    if (!lmo) {
      lmo = await orm.Lmo.create({
        userId: user.id,
        employeeId: s.empId,
        designation: 'Senior Inspector Legal Metrology',
        baseAdministrativeUnitId: s.base,
        isActive: true,
      });

      for (const tId of s.types) {
        await orm.LmoInstrumentType.create({ lmoId: lmo.id, instrumentTypeId: tId });
      }
      for (const jId of s.juris) {
        await orm.LmoJurisdiction.create({ lmoId: lmo.id, administrativeUnitId: jId });
      }
    }
    seededLmos.push({ user, lmo });
  }

  // 7. GATCs (Govt Approved Test Centres - Exactly 3)
  console.log('🏢 Seeding 3 Govt Approved Test Centres (GATCs)...');
  const gatcSpecs = [
    {
      approval: 'GATC-MH-PUN-001',
      name: 'Apex Metrology & Calibration Labs',
      dist: puneDist.id,
      address: 'Plot 45, MIDC Bhosari, Pune',
      types: [ewbType.id, wbrType.id],
      serviceAreas: [puneDist.id],
      mgrEmail: 'manager.apex@gatc.org',
      mgrName: 'Suresh Rao',
      opEmail: 'operator.apex@gatc.org',
      opName: 'Rohan Verma',
    },
    {
      approval: 'GATC-MH-MUM-002',
      name: 'Precision Test Labs India Pvt Ltd',
      dist: mumbaiDist.id,
      address: 'Unit 12, Industrial Estate, Andheri East, Mumbai',
      types: [fdpType.id, astType.id],
      serviceAreas: [mumbaiDist.id],
      mgrEmail: 'manager.pml@gatc.org',
      mgrName: 'Anita Nair',
      opEmail: 'operator.pml@gatc.org',
      opName: 'Sachin Gaikwad',
    },
    {
      approval: 'GATC-MH-NAG-003',
      name: 'Vidarbha Verification & Calibration Centre',
      dist: nagpurDist.id,
      address: '22 Civil Lines, Nagpur',
      types: [ewbType.id, pwbType.id],
      serviceAreas: [nagpurDist.id],
      mgrEmail: 'manager.vvc@gatc.org',
      mgrName: 'Manoj Tiwari',
      opEmail: 'operator.vvc@gatc.org',
      opName: 'Pooja Mishra',
    },
  ];

  const seededGatcs = [];
  for (const g of gatcSpecs) {
    let gatc = await orm.Gatc.where({ approvalNumber: g.approval }).first();
    if (!gatc) {
      gatc = await orm.Gatc.create({
        legalName: g.name,
        approvalNumber: g.approval,
        approvalValidFrom: '2023-01-01T00:00:00.000Z',
        approvalValidUntil: '2028-12-31T23:59:59.000Z',
        address: g.address,
        administrativeUnitId: g.dist,
        isActive: true,
      });

      for (const tId of g.types) {
        await orm.GatcAuthorization.create({
          gatcId: gatc.id,
          instrumentTypeId: tId,
          validFrom: '2023-01-01T00:00:00.000Z',
          validUntil: '2028-12-31T23:59:59.000Z',
        });
      }

      for (const aId of g.serviceAreas) {
        await orm.GatcServiceArea.create({
          gatcId: gatc.id,
          administrativeUnitId: aId,
        });
      }
    }

    // Staff (Manager & Operator): centre-scoped authority only, no global role.
    // Runs every seed so pre-existing GATC staff lose any erroneously-seeded role.
    const mgr = await getOrCreateStaffUser({ email: g.mgrEmail, fullName: g.mgrName });
    if (!(await orm.GatcMembership.where({ gatcId: gatc.id, userId: mgr.id }).first())) {
      await orm.GatcMembership.create({ gatcId: gatc.id, userId: mgr.id, role: 'MANAGER', isActive: true });
    }

    const op = await getOrCreateStaffUser({ email: g.opEmail, fullName: g.opName });
    if (!(await orm.GatcMembership.where({ gatcId: gatc.id, userId: op.id }).first())) {
      await orm.GatcMembership.create({ gatcId: gatc.id, userId: op.id, role: 'OPERATOR', isActive: true });
    }

    seededGatcs.push(gatc);
  }

  // 8. Businesses (Exactly 5 Business Profiles & Owners)
  console.log('🏪 Seeding 5 Business Profiles & Owners...');
  const businessSpecs = [
    {
      email: 'owner.reliance@retail.in',
      ownerName: 'Mukesh Parekh',
      businessName: 'Reliance Fresh Superstores',
      regNo: 'GSTIN27AAACR1234F1Z1',
      phone: '+919811122201',
      unitId: hinjewadiVillage.id,
      address: 'Shop 1-4, Blue Ridge High St, Hinjewadi, Pune',
    },
    {
      email: 'owner.bpcl@petro.in',
      ownerName: 'Devendra Joshi',
      businessName: 'BPCL Fuel Oasis Hinjewadi',
      regNo: 'GSTIN27AABCB5678G2Z2',
      phone: '+919811122202',
      unitId: hinjewadiVillage.id,
      address: 'Survey 48, Rajiv Gandhi Infotech Park, Hinjewadi, Pune',
    },
    {
      email: 'owner.tanishq@jewels.in',
      ownerName: 'Kavita Choksi',
      businessName: 'Tanishq Jewellers Bandra',
      regNo: 'GSTIN27AAACT9012H3Z3',
      phone: '+919811122203',
      unitId: bandraVillage.id,
      address: 'Turner Road, Bandra West, Mumbai',
    },
    {
      email: 'owner.tatasteel@logistics.in',
      ownerName: 'Ratan Deshmukh',
      businessName: 'Tata Steel Logistics & Yard',
      regNo: 'GSTIN27AAACT3456J4Z4',
      phone: '+919811122204',
      unitId: andheriTehsil.id,
      address: 'Plot 10, MIDC Andheri East, Mumbai',
    },
    {
      email: 'owner.puneagro@commodities.in',
      ownerName: 'Sanjay Wagh',
      businessName: 'Vidarbha Agro Mandi Terminal',
      regNo: 'GSTIN27AAACV7890K5Z5',
      phone: '+919811122205',
      unitId: dharampethVillage.id,
      address: 'APMC Market Yard, Dharampeth, Nagpur',
    },
  ];

  const seededBusinesses = [];
  for (const b of businessSpecs) {
    const user = await getOrCreateUser({
      email: b.email,
      fullName: b.ownerName,
      phone: b.phone,
      role: 'INSTRUMENT_OWNER',
    });

    let business = await orm.Business.where({ userId: user.id }).first();
    if (!business) {
      business = await orm.Business.create({
        userId: user.id,
        businessName: b.businessName,
        registrationNumber: b.regNo,
        contactPhone: b.phone,
        contactEmail: b.email,
      });
    }
    seededBusinesses.push({ user, business, spec: b });
  }

  // 9. Instruments (Exactly 20 Instruments)
  console.log('🔬 Seeding 20 Instruments...');
  const instrumentSpecs = [
    // Reliance Fresh (4 instruments)
    { bIdx: 0, code: 'DMI-EWB-001', typeId: ewbType.id, mfr: 'Mettler Toledo', model: 'bPlus-T', serial: 'MT-2024-001', cap: '15.0', cls: 'Class III', stat: 'VERIFIED' as const },
    { bIdx: 0, code: 'DMI-EWB-002', typeId: ewbType.id, mfr: 'Mettler Toledo', model: 'bPlus-T', serial: 'MT-2024-002', cap: '15.0', cls: 'Class III', stat: 'VERIFIED' as const },
    { bIdx: 0, code: 'DMI-EWB-003', typeId: ewbType.id, mfr: 'Essae-Teraoka', model: 'DS-215', serial: 'ES-2024-101', cap: '30.0', cls: 'Class III', stat: 'EXPIRING_SOON' as const },
    { bIdx: 0, code: 'DMI-EWB-004', typeId: ewbType.id, mfr: 'Essae-Teraoka', model: 'DS-215', serial: 'ES-2023-909', cap: '30.0', cls: 'Class III', stat: 'EXPIRED' as const },

    // BPCL Fuel Pump (4 instruments)
    { bIdx: 1, code: 'DMI-FDP-005', typeId: fdpType.id, mfr: 'Gilbarco Veeder-Root', model: 'Frontier EU', serial: 'GVR-2024-501', cap: '50.0', cls: 'Class 0.5', stat: 'VERIFIED' as const },
    { bIdx: 1, code: 'DMI-FDP-006', typeId: fdpType.id, mfr: 'Gilbarco Veeder-Root', model: 'Frontier EU', serial: 'GVR-2024-502', cap: '50.0', cls: 'Class 0.5', stat: 'EXPIRING_SOON' as const },
    { bIdx: 1, code: 'DMI-AST-007', typeId: astType.id, mfr: 'Tatsuno India', model: 'Ultra Dispense', serial: 'TAT-2023-771', cap: '20000.0', cls: 'Class 0.2', stat: 'EXPIRED' as const },
    { bIdx: 1, code: 'DMI-FDP-008', typeId: fdpType.id, mfr: 'Tatsuno India', model: 'Ultra Dispense', serial: 'TAT-2024-882', cap: '50.0', cls: 'Class 0.5', stat: 'PENDING_VERIFICATION' as const },

    // Tanishq Jewellers (4 instruments)
    { bIdx: 2, code: 'DMI-PWB-009', typeId: pwbType.id, mfr: 'Sartorius AG', model: 'Secura 225D', serial: 'SAR-2024-011', cap: '220.0', cls: 'Class I', stat: 'VERIFIED' as const },
    { bIdx: 2, code: 'DMI-PWB-010', typeId: pwbType.id, mfr: 'Sartorius AG', model: 'Secura 225D', serial: 'SAR-2024-012', cap: '220.0', cls: 'Class I', stat: 'EXPIRING_SOON' as const },
    { bIdx: 2, code: 'DMI-EWB-011', typeId: ewbType.id, mfr: 'Shimadzu Corp', model: 'ATX224R', serial: 'SHM-2024-301', cap: '220.0', cls: 'Class I', stat: 'VERIFIED' as const },
    { bIdx: 2, code: 'DMI-EWB-012', typeId: ewbType.id, mfr: 'Shimadzu Corp', model: 'ATX224R', serial: 'SHM-2023-299', cap: '220.0', cls: 'Class I', stat: 'REGISTERED' as const },

    // Tata Steel Yard (4 instruments)
    { bIdx: 3, code: 'DMI-WBR-013', typeId: wbrType.id, mfr: 'Avery Weigh-Tronix', model: 'BridgeMont BMS', serial: 'AV-2024-901', cap: '80.0', cls: 'Class III', stat: 'VERIFIED' as const },
    { bIdx: 3, code: 'DMI-WBR-014', typeId: wbrType.id, mfr: 'Avery Weigh-Tronix', model: 'BridgeMont BMS', serial: 'AV-2024-902', cap: '80.0', cls: 'Class III', stat: 'EXPIRING_SOON' as const },
    { bIdx: 3, code: 'DMI-WBR-015', typeId: wbrType.id, mfr: 'IPA Systems', model: 'Pitless 60T', serial: 'IPA-2023-601', cap: '60.0', cls: 'Class III', stat: 'EXPIRED' as const },
    { bIdx: 3, code: 'DMI-WBR-016', typeId: wbrType.id, mfr: 'IPA Systems', model: 'Pitless 60T', serial: 'IPA-2024-602', cap: '60.0', cls: 'Class III', stat: 'PENDING_VERIFICATION' as const },

    // Vidarbha Agro Mandi (4 instruments)
    { bIdx: 4, code: 'DMI-EWB-017', typeId: ewbType.id, mfr: 'Eagle Scales', model: 'Platform 500', serial: 'EAG-2024-701', cap: '500.0', cls: 'Class III', stat: 'VERIFIED' as const },
    { bIdx: 4, code: 'DMI-EWB-018', typeId: ewbType.id, mfr: 'Eagle Scales', model: 'Platform 500', serial: 'EAG-2024-702', cap: '500.0', cls: 'Class III', stat: 'VERIFIED' as const },
    { bIdx: 4, code: 'DMI-WBR-019', typeId: wbrType.id, mfr: 'Tulsi Scales', model: 'Pitless 50T', serial: 'TLS-2024-501', cap: '50.0', cls: 'Class III', stat: 'PENDING_VERIFICATION' as const },
    { bIdx: 4, code: 'DMI-EWB-020', typeId: ewbType.id, mfr: 'Tulsi Scales', model: 'TableTop 30', serial: 'TLS-2024-301', cap: '30.0', cls: 'Class III', stat: 'REGISTERED' as const },
  ];

  const seededInstruments: NonNullable<Awaited<ReturnType<typeof orm.Instrument["first"]>>>[] = [];
  for (const s of instrumentSpecs) {
    const ownerObj = seededBusinesses[s.bIdx];
    let inst = await orm.Instrument.where({ instrumentCode: s.code }).first();
    if (!inst) {
      inst = await orm.Instrument.create({
        instrumentCode: s.code,
        instrumentTypeId: s.typeId,
        businessId: ownerObj.business.id,
        manufacturer: s.mfr,
        model: s.model,
        serialNumber: s.serial,
        yearOfManufacture: 2024,
        purchaseDate: '2024-01-15T00:00:00.000Z',
        capacity: s.cap,
        accuracyClass: s.cls,
        status: s.stat,
        address: ownerObj.spec.address,
        administrativeUnitId: ownerObj.spec.unitId,
      });
    }
    seededInstruments.push(inst);
  }

  // 10. Applications, Work Orders, Inspections, & Certificates
  console.log('📝 Seeding 18 Applications, Work Orders, Inspections, and 10 Certificates...');
  // Scale requirements:
  // - 18 Applications (15 lifecycle stages + 3 active-certificate applications)
  // - Exactly 10 Certificates (3 Expired, 4 Expiring Soon, 3 Active)

  const typeNameById = new Map([ewbType, fdpType, wbrType, astType, pwbType].map((t) => [t.id, t.name]));

  // Per-type rule/template lookup for seeded inspections and certificates.
  const ruleFor = (inst: (typeof seededInstruments)[number]) =>
    seededRules.find((r) => r.instrumentTypeId === inst.instrumentTypeId && r.accuracyClass === inst.accuracyClass) ?? null;
  const templateFor = (inst: (typeof seededInstruments)[number]) =>
    inst.instrumentTypeId === fdpType.id ? fdpTemplate : ewbTemplate;
  const ISSUING_AUTHORITY = 'Legal Metrology Department, Maharashtra';

  const gatcOperatorMembership = await orm.GatcMembership.where({ gatcId: seededGatcs[0].id, role: 'OPERATOR' }).first();
  const gatcOperatorUserId = gatcOperatorMembership?.userId ?? sysAdmin.id;

  const appConfigs = [
    // 0: Draft
    { appCode: 'APP-2026-0001', instIdx: 19, status: 'DRAFT' as const, route: null, cert: null },
    // 1: Submitted
    { appCode: 'APP-2026-0002', instIdx: 18, status: 'SUBMITTED' as const, route: 'LMO' as const, cert: null },
    // 2: Under Review
    { appCode: 'APP-2026-0003', instIdx: 15, status: 'UNDER_REVIEW' as const, route: 'LMO' as const, cert: null },
    // 3: Documents Required (corrections)
    { appCode: 'APP-2026-0004', instIdx: 11, status: 'DOCUMENTS_REQUIRED' as const, route: 'GATC' as const, cert: null },
    // 4: Approved
    { appCode: 'APP-2026-0005', instIdx: 7, status: 'APPROVED' as const, route: 'LMO' as const, cert: null },
    // 5: Scheduled
    { appCode: 'APP-2026-0006', instIdx: 3, status: 'SCHEDULED' as const, route: 'LMO' as const, cert: null },
    // 6: Verification In Progress
    { appCode: 'APP-2026-0007', instIdx: 16, status: 'VERIFICATION_IN_PROGRESS' as const, route: 'GATC' as const, cert: null },
    // 7: Failed
    { appCode: 'APP-2026-0008', instIdx: 17, status: 'FAILED' as const, route: 'LMO' as const, cert: null },

    // 8-10: 3 EXPIRED Certificates
    {
      appCode: 'APP-2026-0009', instIdx: 3, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2024-0001', verifiedAt: '2024-05-15T10:00:00.000Z', validUntil: '2025-05-14T23:59:59.000Z', status: 'EXPIRED' as const },
    },
    {
      appCode: 'APP-2026-0010', instIdx: 6, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2024-0002', verifiedAt: '2024-06-01T10:00:00.000Z', validUntil: '2025-05-31T23:59:59.000Z', status: 'EXPIRED' as const },
    },
    {
      appCode: 'APP-2026-0011', instIdx: 14, status: 'CERTIFICATE_GENERATED' as const, route: 'GATC' as const,
      cert: { code: 'CERT-2024-0003', verifiedAt: '2024-04-10T10:00:00.000Z', validUntil: '2025-04-09T23:59:59.000Z', status: 'EXPIRED' as const },
    },

    // 11-14: 4 EXPIRING SOON Certificates (Expiring within next 15-45 days from Sept 2026)
    {
      appCode: 'APP-2026-0012', instIdx: 2, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2025-0004', verifiedAt: '2025-09-20T10:00:00.000Z', validUntil: '2026-09-19T23:59:59.000Z', status: 'EXPIRING_SOON' as const },
    },
    {
      appCode: 'APP-2026-0013', instIdx: 5, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2025-0005', verifiedAt: '2025-10-01T10:00:00.000Z', validUntil: '2026-09-30T23:59:59.000Z', status: 'EXPIRING_SOON' as const },
    },
    {
      appCode: 'APP-2026-0014', instIdx: 9, status: 'CERTIFICATE_GENERATED' as const, route: 'GATC' as const,
      cert: { code: 'CERT-2025-0006', verifiedAt: '2025-10-15T10:00:00.000Z', validUntil: '2026-10-14T23:59:59.000Z', status: 'EXPIRING_SOON' as const },
    },
    {
      appCode: 'APP-2026-0015', instIdx: 13, status: 'CERTIFICATE_GENERATED' as const, route: 'GATC' as const,
      cert: { code: 'CERT-2025-0007', verifiedAt: '2025-10-25T10:00:00.000Z', validUntil: '2026-10-24T23:59:59.000Z', status: 'EXPIRING_SOON' as const },
    },
  ];

  // Also add the 3 ACTIVE certificates on instruments 0, 8, 12 so we have 10 certificates total
  // Instruments 0 (EWB), 8 (PWB), 12 (WBR) have verified status and active certs
  const activeCertApps = [
    {
      appCode: 'APP-2025-0098', instIdx: 0, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2026-0008', verifiedAt: '2026-05-10T10:00:00.000Z', validUntil: '2027-05-09T23:59:59.000Z', status: 'ACTIVE' as const },
    },
    {
      appCode: 'APP-2025-0099', instIdx: 8, status: 'CERTIFICATE_GENERATED' as const, route: 'GATC' as const,
      cert: { code: 'CERT-2026-0009', verifiedAt: '2026-06-15T10:00:00.000Z', validUntil: '2027-06-14T23:59:59.000Z', status: 'ACTIVE' as const },
    },
    {
      appCode: 'APP-2025-0100', instIdx: 12, status: 'CERTIFICATE_GENERATED' as const, route: 'LMO' as const,
      cert: { code: 'CERT-2026-0010', verifiedAt: '2026-07-20T10:00:00.000Z', validUntil: '2028-07-19T23:59:59.000Z', status: 'ACTIVE' as const },
    },
  ];

  // Execute application seeding
  for (const cfg of [...appConfigs, ...activeCertApps]) {
    const inst = seededInstruments[cfg.instIdx];
    let app = await orm.Application.where({ applicationCode: cfg.appCode }).first();
    if (!app) {
      app = await orm.Application.create({
        applicationCode: cfg.appCode,
        instrumentId: inst.id,
        type: 'INITIAL_VERIFICATION',
        status: cfg.status,
        route: cfg.route,
        priority: 'MEDIUM',
        submittedAt: cfg.status !== 'DRAFT' ? '2026-08-01T10:00:00.000Z' : null,
      });

      await orm.ApplicationStatusHistory.create({
        applicationId: app.id,
        fromStatus: null,
        toStatus: cfg.status,
        reason: 'Seeded initial application state',
      });
    }

    // Work order if scheduled, in progress, passed, failed, or certificate generated
    const workOrderStatuses: string[] = ['SCHEDULED', 'VERIFICATION_IN_PROGRESS', 'FAILED', 'CERTIFICATE_GENERATED'];
    const hasWorkOrder = Boolean(cfg.route && workOrderStatuses.includes(cfg.status));
    if (hasWorkOrder) {
      let wo = await orm.WorkOrder.where({ applicationId: app.id }).first();
      if (!wo) {
        const isLmo = cfg.route === 'LMO';
        wo = await orm.WorkOrder.create({
          applicationId: app.id,
          route: cfg.route!,
          lmoId: isLmo ? seededLmos[0].lmo.id : null,
          gatcId: !isLmo ? seededGatcs[0].id : null,
          assignedById: sysAdmin.id,
          assignedAt: '2026-08-05T10:00:00.000Z',
          scheduledStartAt: '2026-08-10T09:00:00.000Z',
          scheduledEndAt: '2026-08-10T12:00:00.000Z',
        });
      }
    }

    // Inspection if in progress, failed, or certificate generated
    if (cfg.status === 'VERIFICATION_IN_PROGRESS' || cfg.status === 'FAILED' || cfg.status === 'CERTIFICATE_GENERATED') {
      let insp = await orm.Inspection.where({ applicationId: app.id }).first();
      if (!insp) {
        const isLmo = cfg.route === 'LMO';
        const isPass = cfg.status === 'CERTIFICATE_GENERATED';
        const isFail = cfg.status === 'FAILED';

        insp = await orm.Inspection.create({
          applicationId: app.id,
          lmoId: isLmo ? seededLmos[0].lmo.id : null,
          gatcId: !isLmo ? seededGatcs[0].id : null,
          performedById: isLmo ? seededLmos[0].user.id : gatcOperatorUserId,
          startedAt: '2026-08-10T09:30:00.000Z',
          submittedAt: cfg.status !== 'VERIFICATION_IN_PROGRESS' ? '2026-08-10T11:00:00.000Z' : null,
          finalizedAt: cfg.status !== 'VERIFICATION_IN_PROGRESS' ? '2026-08-10T11:30:00.000Z' : null,
          finalizedById: cfg.status !== 'VERIFICATION_IN_PROGRESS' ? (isLmo ? seededLmos[0].user.id : gatcOperatorUserId) : null,
          result: isPass ? 'PASS' : (isFail ? 'FAIL' : null),
          templateId: templateFor(inst).id,
          ruleVersionId: ruleFor(inst)?.id ?? null,
          notes: isFail ? 'Exceeded permissible tolerance limit on load test.' : 'All tests within permissible limits.',
        });

        // Add sample measurements
        await orm.InspectionMeasurement.create({
          inspectionId: insp.id,
          sequence: 1,
          code: 'ZERO_LOAD',
          label: 'Zero load indication',
          unit: 'kg',
          standardValue: '0.000',
          observedValue: isFail ? '0.025' : '0.000',
          permissibleError: '0.010',
          observedError: isFail ? '0.025' : '0.000',
          withinLimit: !isFail,
        });
      }
    }

    // Certificate if specified
    if (cfg.cert) {
      let cert = await orm.Certificate.where({ certificateCode: cfg.cert.code }).first();
      if (!cert) {
        const rule = ruleFor(inst);
        const businessName = seededBusinesses.find((b) => b.business.id === inst.businessId)?.business.businessName ?? '';
        const payloadHash = hashPayload(buildCanonicalPayload({
          certificateCode: cfg.cert.code,
          applicationCode: cfg.appCode,
          instrumentCode: inst.instrumentCode,
          manufacturer: inst.manufacturer,
          model: inst.model,
          serialNumber: inst.serialNumber,
          instrumentTypeName: typeNameById.get(inst.instrumentTypeId) ?? '',
          capacity: inst.capacity,
          accuracyClass: inst.accuracyClass,
          businessName,
          result: 'PASS',
          ruleReference: rule?.id ?? '',
          verifiedAt: cfg.cert.verifiedAt,
          validUntil: cfg.cert.validUntil,
          issuingAuthority: ISSUING_AUTHORITY,
        }));

        cert = await orm.Certificate.create({
          certificateCode: cfg.cert.code,
          applicationId: app.id,
          instrumentId: inst.id,
          ruleVersionId: rule?.id ?? null,
          payloadHash,
          verifiedAt: cfg.cert.verifiedAt,
          validUntil: cfg.cert.validUntil,
          status: cfg.cert.status,
        });

        await orm.CertificateStatusHistory.create({
          certificateId: cert.id,
          fromStatus: null,
          toStatus: cfg.cert.status,
          reason: 'Initial verification certificate generated',
        });

        // Add sample public verification check
        await orm.CertificateVerification.create({
          certificateId: cert.id,
          ipAddress: '127.0.0.1',
          presentedPayloadHash: payloadHash,
          matched: true,
          checkedAt: '2026-08-15T14:30:00.000Z',
        });
      }
    }
  }

  // 11. Sample Notifications & Audit Log
  console.log('🔔 Seeding initial notifications and audit records...');
  const ownerUser = seededBusinesses[0].user;
  const sampleNotif = await orm.Notification.where({ userId: ownerUser.id }).first();
  if (!sampleNotif) {
    await orm.Notification.create({
      userId: ownerUser.id,
      channel: 'IN_APP',
      event: 'CERTIFICATE_EXPIRING_SOON',
      payload: {
        title: 'Verification Certificate Expiring Soon',
        message: 'Your Electronic Weighing Balance (DMI-EWB-003) certificate expires in 16 days. Please schedule reverification.',
      },
      status: 'SENT',
      sentAt: '2026-09-01T08:00:00.000Z',
    });
  }

  const sampleAudit = await orm.AuditLog.where({ action: 'DEMO_SEED' }).first();
  if (!sampleAudit) {
    await orm.AuditLog.create({
      actorId: sysAdmin.id,
      actorRole: 'SYSTEM_ADMIN',
      action: 'DEMO_SEED',
      entityType: 'System',
      entityId: 'SYSTEM',
      newState: {
        description: 'SIH demo dataset initialized successfully with 5 businesses, 20 instruments, 18 applications, 6 LMOs, 3 GATCs, 10 certificates.',
      },
      ipAddress: '127.0.0.1',
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('📊 Summary:');
  console.log(`- 5 Businesses: ${seededBusinesses.map(b => b.business.businessName).join(', ')}`);
  console.log(`- 20 Instruments created`);
  console.log(`- 18 Applications created across all lifecycle stages`);
  console.log(`- 6 LMOs provisioned with jurisdictions and category expertise`);
  console.log(`- 3 GATCs provisioned with staff, service areas, and authorizations`);
  console.log(`- 10 Certificates (3 Expired, 4 Expiring Soon, 3 Active)`);
  console.log(`- Default Demo Password for all accounts: ${DEMO_PASSWORD}`);

  await db.close();
}

// Execute immediately when run as a script
main().catch(async (e) => {
  console.error('❌ Error during seed:', e);
  try {
    await db.close();
  } catch {}
  process.exit(1);
});
