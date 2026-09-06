import { base } from "@/contracts/base";
import { SearchInputSchema, SearchOutputSchema } from "./schema";

export const globalSearchContract = base
  .route({
    method: "GET",
    path: "/search",
    summary: "Global search",
    description: "Permission-aware search across instruments, certificates, applications, and businesses.",
    tags: ["Search"],
  })
  .input(SearchInputSchema)
  .output(SearchOutputSchema);

export const searchContract = {
  global: globalSearchContract,
};
