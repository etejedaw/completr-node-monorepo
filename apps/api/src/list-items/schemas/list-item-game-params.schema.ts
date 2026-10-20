import { z } from "zod";

export const ListItemGameParamsSchema = z.object({
	listId: z.uuid(),
	gameId: z.uuid()
});

export type ListItemGameParams = z.infer<typeof ListItemGameParamsSchema>;
