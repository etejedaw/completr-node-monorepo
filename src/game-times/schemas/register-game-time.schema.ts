import z from "zod";

export const RegisterGameTimeSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(["hltb", "rawg"]),
		duration: z.number()
	})
	.strict()
	.readonly();
