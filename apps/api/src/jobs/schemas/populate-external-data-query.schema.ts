import z from "zod";

export const PopulateExternalDataQuerySchema = z
	.object({
		limit: z.coerce.number().int().positive().optional()
	})
	.strict()
	.readonly();

export type PopulateExternalDataQuery = z.infer<
	typeof PopulateExternalDataQuerySchema
>;
