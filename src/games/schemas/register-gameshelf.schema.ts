import z from "zod";

export const RegisterGameshelfSchema = z
	.object({
		userId: z.string(),
		gameId: z.string(),
		platformId: z.string(),
		acquiredAt: z.iso.date().optional(),
		edition: z.string().max(100).nonempty().optional(),
		notes: z.string().max(100).nonempty().optional()
	})
	.strict()
	.readonly();
