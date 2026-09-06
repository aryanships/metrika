import { z } from "zod";

export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const PaginationInputSchema = z.object({
  cursor: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().optional(),
  sortOrder: SortOrderSchema.default("desc"),
});
export type PaginationInput = z.infer<typeof PaginationInputSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable().optional(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function createPaginatedOutputSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
    nextCursor: null,
  };
}

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const SelectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});
export type SelectOption = z.infer<typeof SelectOptionSchema>;

export const IdParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});
export type IdParam = z.infer<typeof IdParamSchema>;

export const CodeParamSchema = z.object({
  code: z.string().min(1, "Code is required"),
});
export type CodeParam = z.infer<typeof CodeParamSchema>;
