import z from "zod";

export const FranchiseCodeParamsSchema = z
	.object({
		code: z.string().nonempty()
	})
	.strict()
	.readonly();

export type FranchiseCodeParam = z.infer<typeof FranchiseCodeParamsSchema>;
