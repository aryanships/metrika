import { implement } from "@orpc/server";
import { searchContract } from "../contract";
import { searchService } from "./service";
import { requireAuth } from "@/middleware/require-auth";
import type { AppContext } from "@/middleware/context";

const implementer = implement(searchContract).$context<AppContext>();

export const searchRouter = implementer.router({
  global: implementer.global.use(requireAuth).handler(async ({ input, context }) => {
    return searchService.global(input, context.user!);
  }),
});
