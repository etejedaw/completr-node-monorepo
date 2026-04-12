import z from "zod";
import { EXTERNAL_SOURCES } from "../../game-external/game-external.model";

export const UpdateGameSchema = z
	.object({
		title: z.string().nonempty().optional(),
		description: z.string().nonempty().optional(),
		platforms: z.array(z.string().max(100).nonempty()).optional(),
		releaseAt: z.iso.date().optional(),
		coverUrl: z.string().nonempty().optional(),
		backgroundUrl: z.string().nonempty().optional(),
		isDlc: z.boolean().optional(),
		parentGameId: z.uuid().optional(),
		genres: z.array(z.string().max(100).nonempty()).optional(),
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
