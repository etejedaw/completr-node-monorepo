import z from "zod";

export const AddRewindAiRecapSchema = z
	.object({
		includePrivateRuns: z.boolean(),
		includeNotes: z.boolean()
	})
	.strict();
