import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";

export const BulkDeletePlatinumsSchema = z
	.object({ gameIds: BulkIdsSchema })
	.strict()
	.readonly();
