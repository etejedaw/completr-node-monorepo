import z from "zod";

export const UpdateFranchiseSchema = z
	.object({
		name: z.string().max(100).nonempty(),
		description: z.string().max(500).nullish(),
		gameIds: z.array(z.uuid()).min(1).max(500).optional()
	})
	.strict()
	.readonly();
