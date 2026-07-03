import z from "zod";

export const ReorderSavedFiltersSchema = z
	.object({
		ids: z
			.uuid()
			.array()
			.min(1)
			.max(100)
			.refine(ids => new Set(ids).size === ids.length, {
				message: "Duplicate ids are not allowed"
			})
	})
	.strict()
	.readonly();
