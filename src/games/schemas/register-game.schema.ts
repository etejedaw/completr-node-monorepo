import z from "zod";
import { SCORE_SOURCES } from "../../score-sources/score-source.constants";
import { TIME_SOURCES } from "../../game-times/game-time.model";
import { EXTERNAL_SOURCES } from "../../game-external/game-external.model";

const GameScoreEntrySchema = z.object({
	source: z.enum(SCORE_SOURCES),
	score: z.number().positive()
});

const GameTimeEntrySchema = z.object({
	source: z.enum(TIME_SOURCES),
	duration: z.number().positive()
});

export const RegisterGameSchema = z
	.object({
		title: z.string().max(200).nonempty(),
		description: z.string().nonempty().optional(),
		platforms: z
			.array(z.string().max(100).nonempty())
			.optional()
			.default([]),
		genres: z.array(z.string().max(100).nonempty()).optional().default([]),
		releaseAt: z.iso.date().optional(),
		coverUrl: z.string().nonempty().optional(),
		backgroundUrl: z.string().nonempty().optional(),
		isDlc: z.boolean().optional(),
		parentGameId: z.uuid().optional(),
		variant: z.string().max(100).nonempty().optional(),
		scores: z.array(GameScoreEntrySchema).optional(),
		times: z.array(GameTimeEntrySchema).optional(),
		externalIds: z
			.array(
				z.object({
					source: z.enum(EXTERNAL_SOURCES),
					externalId: z.string().nonempty()
				})
			)
			.optional()
	})
	.strict()
	.readonly();
