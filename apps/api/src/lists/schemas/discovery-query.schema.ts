import z from "zod";

export const DiscoveryQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(50).default(12)
	})
	.strict()
	.readonly();

export type DiscoveryQuery = z.infer<typeof DiscoveryQuerySchema>;
