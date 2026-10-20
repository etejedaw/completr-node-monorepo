import { z } from "zod";

export const AddListItemSchema = z.object({
	gameId: z.uuid()
});

export type AddListItemBody = z.infer<typeof AddListItemSchema>;
