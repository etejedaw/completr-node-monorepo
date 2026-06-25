import z from "zod";

export const SYNC_FIELDS = [
	"status",
	"startedAt",
	"finishedAt",
	"realDuration"
] as const;

export const SyncSchema = z
	.object({
		fromBacklogId: z.uuid(),
		fields: z.array(z.enum(SYNC_FIELDS)).min(1)
	})
	.strict()
	.readonly();
