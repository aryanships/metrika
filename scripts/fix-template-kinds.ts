import "dotenv/config";
import { db } from "../prisma/db";

async function main() {
  console.log("Checking and updating InspectionTemplateItem kinds...");
  const itemsToUpdate = await db.orm.public.InspectionTemplateItem.where({
    code: "ITEM-ZERO",
    kind: "NUMERIC",
  }).all();

  for (const item of itemsToUpdate) {
    console.log(`Updating ITEM-ZERO (${item.id}) to MEASUREMENT`);
    await db.orm.public.InspectionTemplateItem.where({ id: item.id }).update({
      kind: "MEASUREMENT",
    });
  }

  const maxCapItems = await db.orm.public.InspectionTemplateItem.where({
    code: "ITEM-MAXCAP",
    kind: "NUMERIC",
  }).all();

  for (const item of maxCapItems) {
    console.log(`Updating ITEM-MAXCAP (${item.id}) to MEASUREMENT`);
    await db.orm.public.InspectionTemplateItem.where({ id: item.id }).update({
      kind: "MEASUREMENT",
    });
  }

  // Verify all template items
  const allItems = await db.orm.public.InspectionTemplateItem.all();
  console.log("Total template items:", allItems.length);
  const measurementItems = allItems.filter((i) => i.kind === "MEASUREMENT");
  console.log("Measurement items:", measurementItems.map((i) => ({ id: i.id, code: i.code, label: i.label })));

  // Inspect the target application
  const app = await db.orm.public.Application.first({ id: "3f42250e-d728-438a-8a95-96eb3b47509c" });
  console.log("Target application status:", app?.status, "id:", app?.id);
}

main()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
