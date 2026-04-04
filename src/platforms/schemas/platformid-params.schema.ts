import z from "zod";

export const PlatformIdParamSchema = z
	.object({
		platformId: z.uuid()
	})
	.strict()
	.readonly();

export type PlatformIdParam = z.infer<typeof PlatformIdParamSchema>;
