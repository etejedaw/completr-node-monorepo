import z from "zod";
import { BACKLOG_STATUSES } from "../backlog.model";

export const BacklogQuerySchema = z
	.object({
		status: z.enum(BACKLOG_STATUSES).optional(),
		game_id: z.uuid().optional(),
		from: z.iso.date().optional(),
		to: z.iso.date().optional()
	})
	.strict()
	.readonly();

export type BacklogQuery = z.infer<typeof BacklogQuerySchema>;
