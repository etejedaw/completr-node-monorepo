import z from "zod";

export const RegisterGameSchema = z
	.object({
		title: z.string().max(200).nonempty(),
		description: z.string().nonempty(),
		platforms: z.array(z.string().max(100).nonempty()).min(1),
		releaseAt: z.iso.date().optional(),
		coverUrl: z.string().nonempty().optional()
	})
	.strict()
	.readonly();
