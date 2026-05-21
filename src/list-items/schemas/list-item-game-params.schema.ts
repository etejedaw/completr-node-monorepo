import { z } from "zod";

export const ListItemGameParamsSchema = z.object({
	listId: z.uuid(),
	gameId: z.uuid()
});
