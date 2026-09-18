import z from "zod";

export const RegisterGameShelfSchema = z
	.object({
		gameId: z.string().nonempty(),
		platformId: z.string().nonempty(),
		acquiredAt: z.iso.date().optional(),
		edition: z.string().max(100).nonempty().optional(),
		notes: z.string().max(100).nonempty().optional()
	})
	.strict()
	.readonly();
