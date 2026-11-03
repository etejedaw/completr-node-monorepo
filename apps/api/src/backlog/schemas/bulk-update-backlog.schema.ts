import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";
import { UpdateBacklogFieldsSchema } from "./update-backlog.schema";

export const BulkUpdateBacklogSchema = z
	.object({
		ids: BulkIdsSchema,
		changes: UpdateBacklogFieldsSchema.pick({
			status: true,
			startedAt: true,
			finishedAt: true,
			userRating: true,
			isPublic: true
		})
			.strict()
			.refine(changes => Object.keys(changes).length > 0, {
				message: "changes must include at least one field"
			})
	})
	.strict()
	.readonly();
