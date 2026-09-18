import z from "zod";

export const FranchiseIdParamSchema = z
	.object({
		franchiseId: z.uuid()
	})
	.strict()
	.readonly();

export type FranchiseIdParam = z.infer<typeof FranchiseIdParamSchema>;
