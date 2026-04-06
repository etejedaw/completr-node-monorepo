import z from "zod";

export const ReplaceListItemsSchema = z
	.object({
		gameIds: z.uuid().array().min(1)
	})
	.strict()
	.readonly();
