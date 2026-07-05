import z from "zod";

import { ACTIVITY_TYPES } from "../activity.model";

export const FEED_CATEGORIES = ["games", "lists", "social"] as const;

export const FeedQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		category: z.enum(FEED_CATEGORIES).optional(),
		types: z
			.string()
			.transform(val => val.split(","))
			.pipe(z.enum(ACTIVITY_TYPES).array().min(1))
			.optional()
	})
	.readonly();

export type FeedQuery = z.infer<typeof FeedQuerySchema>;
