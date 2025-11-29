import z from "zod";

export const RegisterPlatformSchema = z
	.object({
		name: z.string().max(100).nonempty(),
		abbreviation: z.string().max(10).nonempty(),
		description: z.string().nonempty(),
		manufacturer: z.string().max(100).nonempty(),
		generation: z.number().int().positive().optional(),
		logoUrl: z.string().nonempty().optional(),
		releaseAt: z.iso.date()
	})
	.strict()
	.readonly();
