async function testRole(email: string, rolePages: string[]) {
  console.log(`\n========================================`);
  console.log(`Testing Role: ${email}`);
  console.log(`========================================`);

  const loginRes = await fetch("http://localhost:3001/rpc/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { email, password: "Demo1234!" } }),
  });

  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) {
    // Try Demo1234!
    const loginRes2 = await fetch("http://localhost:3001/rpc/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Demo1234!" }),
    });
    const cookie2 = loginRes2.headers.get("set-cookie");
    if (!cookie2) {
      console.error(`Failed to login ${email}:`, await loginRes2.text());
      return;
    }
    return runPages(email, cookie2.split(";")[0], rolePages);
  }

  return runPages(email, cookie.split(";")[0], rolePages);
}

async function runPages(email: string, sessionCookie: string, rolePages: string[]) {
  console.log(`Logged in as ${email}. Checking ${rolePages.length} routes...`);

  let allOk = true;
  for (const page of rolePages) {
    try {
      const res = await fetch("http://localhost:3001" + page, {
        headers: { Cookie: sessionCookie },
        redirect: "manual",
      });

      const status = res.status;
      const location = res.headers.get("location") || "";
      const isGood = status === 200;

      console.log(`  [${isGood ? "OK" : "WARN"}] ${page.padEnd(45)} -> ${status} ${location}`);

      if (status >= 500) {
        allOk = false;
        const text = await res.text();
        console.error(`    ❌ 500 Server Error for ${page}:`, text.slice(0, 500));
      }
    } catch (err: any) {
      allOk = false;
      console.error(`    ❌ Network/Fetch Error for ${page}:`, err.message);
    }
  }

  if (allOk) {
    console.log(`✅ All pages for ${email} rendered successfully!`);
  }
}

async function main() {
  await testRole("owner.reliance@retail.in", [
    "/business",
    "/business/instruments",
    "/business/instruments/new",
    "/business/applications",
    "/business/applications/new",
    "/business/certificates",
    "/business/notifications",
    "/business/profile",
  ]);

  await testRole("lmo.sharma@metrika.gov.in", [
    "/field",
    "/field/work-orders",
    "/field/certificates",
  ]);

  await testRole("distadmin.pune@metrika.gov.in", [
    "/admin",
    "/admin/applications",
    "/admin/lmos",
    "/admin/certificates",
    "/admin/gatcs",
    "/admin/audit",
  ]);

  await testRole("admin@metrika.gov.in", [
    "/system",
    "/system/admins",
    "/system/masters/instrument-types",
    "/system/masters/inspection-templates",
    "/system/masters/administrative-units",
    "/system/masters/regulatory-rules",
    "/system/audit",
  ]);
}

main().catch(console.error);
