import { db } from "../prisma/db";

const orm = db.orm.public;

async function login(email: string) {
  const res = await fetch("http://localhost:3001/rpc/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email, password: "Demo1234!" } }),
  });
  const cookie = res.headers.get("set-cookie");
  if (!cookie) throw new Error(`Could not login ${email}`);
  return cookie.split(";")[0];
}

async function main() {
  console.log("Fetching seeded IDs for detail page testing...");

  const instrument = await orm.Instrument.first();
  const application = await orm.Application.first();
  const certificate = await orm.Certificate.first();

  console.log("Instrument ID:", instrument?.id);
  console.log("Application ID:", application?.id);
  console.log("Certificate ID:", certificate?.id);

  if (!instrument || !application || !certificate) {
    console.error("Missing seeded entities!");
    return;
  }

  const ownerCookie = await login("owner.reliance@retail.in");
  const lmoCookie = await login("lmo.sharma@metrika.gov.in");
  const adminCookie = await login("distadmin.pune@metrika.gov.in");

  const detailRoutes = [
    { role: "Owner", cookie: ownerCookie, path: `/business/instruments/${instrument.id}` },
    { role: "Owner", cookie: ownerCookie, path: `/business/applications/${application.id}` },
    { role: "Owner", cookie: ownerCookie, path: `/business/certificates/${certificate.id}` },
    { role: "LMO", cookie: lmoCookie, path: `/field/applications/${application.id}` },
    { role: "LMO", cookie: lmoCookie, path: `/field/applications/${application.id}/inspect` },
    { role: "Admin", cookie: adminCookie, path: `/admin/applications/${application.id}` },
  ];

  for (const r of detailRoutes) {
    const res = await fetch(`http://localhost:3001${r.path}`, {
      headers: { Cookie: r.cookie },
      redirect: "manual",
    });
    console.log(`[${r.role}] ${r.path.padEnd(65)} -> ${res.status}`);
    if (res.status >= 500) {
      console.error(`  ❌ 500 Error:`, (await res.text()).slice(0, 500));
    }
  }

  console.log("\n✅ Detail pages verification complete!");
}

main().then(() => process.exit(0)).catch(console.error);
