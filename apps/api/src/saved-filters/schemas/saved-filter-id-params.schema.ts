import z from "zod";

export const SavedFilterIdParamsSchema = z
	.object({
		filterId: z.uuid()
	})
	.strict()
	.readonly();

export type SavedFilterIdParams = z.infer<typeof SavedFilterIdParamsSchema>;
