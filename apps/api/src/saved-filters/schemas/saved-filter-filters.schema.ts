import z from "zod";

import { BacklogQuerySchema } from "../../backlog/schemas/backlog-query.schema";

export const SavedFilterFiltersSchema = z
	.record(z.string(), z.unknown())
	.refine(filters => BacklogQuerySchema.safeParse(filters).success, {
		message: "Filters do not match the backlog query"
	});
