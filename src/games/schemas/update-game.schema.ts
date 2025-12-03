import z from "zod";

export const UpdateGameSchema = z
	.object({
		description: z.string().nonempty().optional(),
		platforms: z.array(z.string().max(100).nonempty()).optional(),
		releaseAt: z.iso.date().optional(),
		coverUrl: z.string().optional(),
		averageScore: z.number().optional(),
		averagePlaytime: z.number().optional()
	})
	.strict()
	.readonly();
