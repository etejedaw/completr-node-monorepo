import { z } from "zod";

export const GameListsParamsSchema = z.object({
	gameId: z.uuid()
});

export type GameListsParams = z.infer<typeof GameListsParamsSchema>;
