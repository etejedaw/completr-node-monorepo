import z from "zod";

import { PaginationQuerySchema } from "../../common/schemas/pagination-query.schema";

const COMPARISON_DIMENSIONS = [
	"completed",
	"playing",
	"not_started",
	"shelf",
	"favorites",
	"wishlist"
] as const;

export const ComparisonQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		by: z.enum(COMPARISON_DIMENSIONS).default("completed"),
		includeOnlyTarget: z.stringbool().default(false),
		includeOnlyViewer: z.stringbool().default(false),
		offset: z.coerce.number().int().min(0).default(0)
	})
	.strict()
	.readonly();

export type ComparisonDimension = (typeof COMPARISON_DIMENSIONS)[number];
export type ComparisonQuery = z.infer<typeof ComparisonQuerySchema>;
