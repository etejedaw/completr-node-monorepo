import z from "zod";

import { TIME_SOURCES_API } from "../game-time.model";

export const ReplaceGameTimesSchema = z
	.object({
		times: z
			.array(
				z
					.object({
						source: z.enum(TIME_SOURCES_API),
						duration: z.number().positive()
					})
					.strict()
			)
			.refine(
				times =>
					new Set(times.map(entry => entry.source)).size ===
					times.length,
				{ message: "Sources must not be repeated" }
			)
	})
	.strict()
	.readonly();
