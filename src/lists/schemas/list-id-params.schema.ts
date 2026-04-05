import z from "zod";

export const ListIdParamsSchema = z
	.object({
		listId: z.uuid()
	})
	.strict()
	.readonly();

export type ListIdParams = z.infer<typeof ListIdParamsSchema>;
