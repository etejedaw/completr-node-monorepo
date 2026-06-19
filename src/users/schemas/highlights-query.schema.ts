import z from "zod";

export const HighlightsQuerySchema = z
	.object({
		year: z.coerce.number().int().min(1970).max(9999).optional(),
		month: z.coerce.number().int().min(1).max(12).optional()
	})
	.strict()
	.refine(v => (v.year === undefined) === (v.month === undefined), {
		message: "year and month must be provided together"
	})
	.readonly();

export type HighlightsQuery = z.infer<typeof HighlightsQuerySchema>;
