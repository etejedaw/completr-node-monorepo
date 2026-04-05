import z from "zod";

export const AddListItemSchema = z
	.object({
		gameId: z.uuid()
	})
	.strict()
	.readonly();
