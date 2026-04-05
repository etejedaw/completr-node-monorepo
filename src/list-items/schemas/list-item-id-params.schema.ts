import z from "zod";

export const ListItemIdParamsSchema = z
	.object({
		listId: z.uuid(),
		itemId: z.uuid()
	})
	.strict()
	.readonly();

export type ListItemIdParams = z.infer<typeof ListItemIdParamsSchema>;
