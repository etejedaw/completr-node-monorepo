import z from "zod";

export const COMPARISON_DIMENSIONS = [
	"completed",
	"playing",
	"not_started",
	"shelf",
	"favorites",
	"wishlist"
] as const;

export const ComparisonQuerySchema = z
	.object({
		by: z.enum(COMPARISON_DIMENSIONS).default("completed"),
		includeOnlyTarget: z.stringbool().default(false),
		includeOnlyViewer: z.stringbool().default(false),
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).default(0)
	})
	.strict()
	.readonly();

export type ComparisonDimension = (typeof COMPARISON_DIMENSIONS)[number];
export type ComparisonQuery = z.infer<typeof ComparisonQuerySchema>;
