import z from "zod";

export const UpdatePlatformSchema = z
	.object({
		abbreviation: z.string().max(10).nonempty().optional(),
		description: z.string().nonempty().optional(),
		manufacturer: z.string().max(100).nonempty().optional(),
		generation: z.number().int().positive().optional(),
		logoUrl: z.string().nonempty().optional(),
		releaseAt: z.iso.date().optional()
	})
	.strict()
	.readonly();
