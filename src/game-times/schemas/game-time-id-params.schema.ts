import z from "zod";
import { TIME_SOURCES_API } from "../game-time.model";

export const GameTimeIdParamsSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(TIME_SOURCES_API)
	})
	.strict()
	.readonly();

export type GameTimeIdParams = z.infer<typeof GameTimeIdParamsSchema>;
