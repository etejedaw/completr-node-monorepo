import z from "zod";

export const TagGamesQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(48).default(24),
		offset: z.coerce.number().int().min(0).default(0)
	})
	.strict()
	.readonly();

export type TagGamesQuery = z.infer<typeof TagGamesQuerySchema>;
