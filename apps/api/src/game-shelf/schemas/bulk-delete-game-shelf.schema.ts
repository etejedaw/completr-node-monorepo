import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";

export const BulkDeleteGameShelfSchema = z
	.object({ ids: BulkIdsSchema })
	.strict()
	.readonly();
