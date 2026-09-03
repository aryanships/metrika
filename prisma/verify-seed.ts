import 'dotenv/config';
import { db } from './db';

async function verify() {
  const orm = db.orm.public;
  
  const businesses = await orm.Business.select('id').all();
  const instruments = await orm.Instrument.select('id').all();
  const applications = await orm.Application.select('id', 'status').all();
  const lmos = await orm.Lmo.select('id').all();
  const gatcs = await orm.Gatc.select('id').all();
  const certificates = await orm.Certificate.select('id', 'status').all();
  const users = await orm.User.select('id', 'email').all();
  const rules = await orm.RegulatoryRule.select('id').all();
  const units = await orm.AdministrativeUnit.select('id').all();

  const expiredCerts = certificates.filter(c => c.status === 'EXPIRED');
  const expiringSoonCerts = certificates.filter(c => c.status === 'EXPIRING_SOON');
  const activeCerts = certificates.filter(c => c.status === 'ACTIVE');

  console.log('--- SEED VERIFICATION RESULTS ---');
  console.log(`Users: ${users.length}`);
  console.log(`Administrative Units: ${units.length}`);
  console.log(`Regulatory Rules: ${rules.length}`);
  console.log(`Businesses: ${businesses.length} (Target: >= 5)`);
  console.log(`Instruments: ${instruments.length} (Target: >= 20)`);
  console.log(`Applications: ${applications.length} (Target: >= 15)`);
  console.log(`LMOs: ${lmos.length} (Target: >= 6)`);
  console.log(`GATCs: ${gatcs.length} (Target: >= 3)`);
  console.log(`Certificates Total: ${certificates.length} (Target: >= 10)`);
  console.log(`  - Expired: ${expiredCerts.length} (Target: 3)`);
  console.log(`  - Expiring Soon: ${expiringSoonCerts.length} (Target: 4)`);
  console.log(`  - Active: ${activeCerts.length} (Target: 3)`);

  const valid = 
    businesses.length >= 5 &&
    instruments.length >= 20 &&
    applications.length >= 15 &&
    lmos.length >= 6 &&
    gatcs.length >= 3 &&
    certificates.length >= 10 &&
    expiredCerts.length === 3 &&
    expiringSoonCerts.length === 4;

  if (!valid) {
    console.error('❌ Verification failed: counts do not match expected demo scale.');
    process.exit(1);
  } else {
    console.log('✅ ALL DEMO SCALE TARGETS SATISFIED PERFECTLY!');
  }

  await db.close();
}

verify().catch(async (err) => {
  console.error(err);
  await db.close();
  process.exit(1);
});
