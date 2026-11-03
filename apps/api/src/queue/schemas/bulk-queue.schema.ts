import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";

export const BulkQueueSchema = z
	.object({ backlogIds: BulkIdsSchema })
	.strict()
	.readonly();
