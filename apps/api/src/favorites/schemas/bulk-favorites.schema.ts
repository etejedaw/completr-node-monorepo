import z from "zod";

import { BulkIdsSchema } from "../../common/schemas/bulk-ids.schema";

export const BulkFavoritesSchema = z
	.object({ gameIds: BulkIdsSchema })
	.strict()
	.readonly();
