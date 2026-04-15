import z from "zod";

export const UpdateGameShelfSchema = z
	.object({
		acquiredAt: z.iso.date().nullable().optional(),
		edition: z.string().max(100).nullable().optional(),
		notes: z.string().max(100).nullable().optional()
	})
	.strict()
	.readonly();
