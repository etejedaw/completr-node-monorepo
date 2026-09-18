import z from "zod";

export const RegisterFranchiseSchema = z
	.object({
		name: z.string().max(100).nonempty(),
		description: z.string().max(500).nullish()
	})
	.strict()
	.readonly();
