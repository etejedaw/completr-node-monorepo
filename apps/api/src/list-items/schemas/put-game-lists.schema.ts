import z from "zod";

export const PutGameListsSchema = z
	.object({
		listIds: z
			.uuid()
			.array()
			.refine(ids => new Set(ids).size === ids.length, {
				message: "Duplicate listIds are not allowed"
			})
	})
	.strict()
	.readonly();
