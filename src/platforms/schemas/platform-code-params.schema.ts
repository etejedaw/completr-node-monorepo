import z from "zod";

export const PlatformCodeParamSchema = z
	.object({
		code: z.string()
	})
	.strict()
	.readonly();

export type PlatformCodeParam = z.infer<typeof PlatformCodeParamSchema>;
