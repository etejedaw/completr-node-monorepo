import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";

export const BulkDeleteBacklogSchema = z
	.object({ ids: BulkIdsSchema })
	.strict()
	.readonly();
