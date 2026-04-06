import z from "zod";

export const ReplaceListItemsSchema = z
	.object({
		gameIds: z
			.uuid()
			.array()
			.refine(ids => new Set(ids).size === ids.length, {
				message: "Duplicate gameIds are not allowed"
			})
	})
	.strict()
	.readonly();
