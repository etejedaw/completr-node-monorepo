import z from "zod";

export const RawgIdParamSchema = z
	.object({
		rawgId: z.coerce.number().int().positive()
	})
	.strict()
	.readonly();

export type RawgIdParam = z.infer<typeof RawgIdParamSchema>;
