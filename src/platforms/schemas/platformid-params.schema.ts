import z from "zod";

export const PlatformIdCodeParamSchema = z
	.object({
		platformId: z.string()
	})
	.strict()
	.readonly();

export type PlatformIdParam = z.infer<typeof PlatformIdCodeParamSchema>;
