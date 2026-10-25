import z from "zod";

export const GAME_PLATINUM_NOTES_MAX_LENGTH = 500;

export const UpsertGamePlatinumSchema = z
	.object({
		backlogId: z.uuid().nullable().optional(),
		platformId: z.uuid().nullable().optional(),
		platinumedAt: z.iso.date().nullable().optional(),
		notes: z
			.string()
			.trim()
			.max(GAME_PLATINUM_NOTES_MAX_LENGTH)
			.nullable()
			.optional()
	})
	.strict()
	.readonly();
