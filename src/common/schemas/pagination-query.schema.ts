import z from "zod";

export const PaginationQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional()
	})
	.readonly();

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
