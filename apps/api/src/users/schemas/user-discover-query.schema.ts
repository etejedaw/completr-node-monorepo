import z from "zod";

export const UserDiscoverQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(50).optional()
	})
	.strict()
	.readonly();

export type UserDiscoverQuery = z.infer<typeof UserDiscoverQuerySchema>;
