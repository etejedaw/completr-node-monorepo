import z from "zod";

export const UpdateGameShelfSchema = z
	.object({
		acquiredAt: z.iso.date().optional(),
		edition: z.string().max(100).optional(),
		notes: z.string().max(100).optional()
	})
	.strict()
	.readonly();
