import z from "zod";

export const RegisterGameShelfSchema = z
	.object({
		gameId: z.uuid(),
		platformId: z.uuid(),
		acquiredAt: z.iso.date().optional(),
		edition: z.string().max(100).nonempty().optional(),
		notes: z.string().max(100).nonempty().optional()
	})
	.strict()
	.readonly();
