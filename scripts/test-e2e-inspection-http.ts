import "dotenv/config";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { router } from "../app/router";

let sessionCookie = "";

const link = new RPCLink({
  url: "http://localhost:3001/rpc",
  fetch: async (input, init) => {
    const headers = new Headers(init?.headers);
    if (sessionCookie) headers.set("Cookie", sessionCookie);
    const res = await fetch(input, { ...init, headers });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(";")[0];
    }
    return res;
  },
});

const client = createORPCClient<typeof router>(link);

async function main() {
  console.log("1. Logging in as LMO (lmo.sharma@metrika.gov.in)...");
  const auth = await client.auth.login({
    email: "lmo.sharma@metrika.gov.in",
    password: "Demo1234!",
  });
  console.log("Logged in successfully as:", auth.user.fullName, `(${auth.user.roles.join(", ")})`);

  const appId = "3f9e003e-fd1f-4f9b-b3dd-ef1c0bd9c935";
  console.log(`\n2. Fetching inspection for application ${appId}...`);
  const inspection = await client.inspections.get({ applicationId: appId });
  console.log("Inspection fetched:", {
    id: inspection.id,
    template: inspection.template?.name,
    items: inspection.template?.items.map((i) => ({ code: i.code, label: i.label, kind: i.kind })),
    measurementsCount: inspection.measurements?.length,
  });

  console.log("\n3. Saving inspection draft with measurement data...");
  const draftResult = await client.inspections.saveDraft({
    applicationId: appId,
    measurements: [
      {
        sequence: 1,
        code: "ITEM-ZERO",
        label: "Zero Load Error Check",
        unit: "kg",
        standardValue: "0.000",
        observedValue: "0.001",
      },
      {
        sequence: 2,
        code: "ITEM-MAXCAP",
        label: "Max Capacity Indication Accuracy",
        unit: "kg",
        standardValue: "30.000",
        observedValue: "30.002",
      },
    ],
    responses: [
      {
        templateItemId: inspection.template!.items.find((i) => i.code === "ITEM-ECCENTRIC")!.id,
        value: true,
      },
      {
        templateItemId: inspection.template!.items.find((i) => i.code === "ITEM-STAMP")!.id,
        value: true,
      },
    ],
    observations: [
      {
        label: "Zero Load Verification",
        severity: "INFO",
        remarks: "Zero load error within acceptable tolerance of 0.001 kg",
      },
    ],
    notes: "E2E verification testing with live measurements",
  });

  console.log("Draft saved successfully! Returned tolerance breakdown:");
  for (const m of draftResult.measurements) {
    console.log(
      `  - ${m.label}: standard=${m.standardValue}, observed=${m.observedValue}, error=${m.observedError}, limit=±${m.permissibleError}, withinLimit=${m.withinLimit}`
    );
  }

  console.log("\n4. Submitting inspection...");
  try {
    const finalResult = await client.inspections.submit({ applicationId: appId });
    console.log("Inspection submitted successfully!", {
      result: finalResult.result,
      status: finalResult.status,
    });
  } catch (err: any) {
    console.log("Submit responded with:", err?.message || err);
    if (err?.data) {
      console.log("Error data:", JSON.stringify(err.data, null, 2));
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
