import z from "zod";

export const PlatformCodeParamSchema = z
	.object({
		code: z.string().nonempty()
	})
	.strict()
	.readonly();

export type PlatformCodeParam = z.infer<typeof PlatformCodeParamSchema>;
