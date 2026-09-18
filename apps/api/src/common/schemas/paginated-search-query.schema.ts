import z from "zod";

export const PaginatedSearchQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		search: z.string().min(1).max(100).optional()
	})
	.readonly();

export type PaginatedSearchQuery = z.infer<typeof PaginatedSearchQuerySchema>;
