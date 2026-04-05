import z from "zod";
import { PLAYTHROUGH_STATUSES } from "../playthrough.model";

export const PlaythroughQuerySchema = z
	.object({
		status: z.enum(PLAYTHROUGH_STATUSES).optional(),
		game_id: z.uuid().optional(),
		from: z.iso.date().optional(),
		to: z.iso.date().optional()
	})
	.strict()
	.readonly();

export type PlaythroughQuery = z.infer<typeof PlaythroughQuerySchema>;
