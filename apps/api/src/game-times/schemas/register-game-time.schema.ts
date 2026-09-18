import z from "zod";

import { TIME_SOURCES_API } from "../game-time.model";

export const RegisterGameTimeSchema = z
	.object({
		gameId: z.uuid(),
		source: z.enum(TIME_SOURCES_API),
		duration: z.number()
	})
	.strict()
	.readonly();
