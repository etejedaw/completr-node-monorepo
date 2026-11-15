import z from "zod";

import { PaginationQuerySchema } from "../../common/schemas/pagination-query.schema";
import { ACTIVITY_TYPES } from "../activity.model";

const FEED_CATEGORIES = ["games", "lists", "social"] as const;

export type FeedCategory = (typeof FEED_CATEGORIES)[number];

export const FeedQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		category: z.enum(FEED_CATEGORIES).optional(),
		types: z
			.string()
			.transform(val => val.split(","))
			.pipe(z.enum(ACTIVITY_TYPES).array().min(1))
			.optional()
	})
	.readonly();

export type FeedQuery = z.infer<typeof FeedQuerySchema>;
