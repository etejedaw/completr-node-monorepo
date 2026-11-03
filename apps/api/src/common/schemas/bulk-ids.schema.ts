import z from "zod";

import { BULK_MAX_IDS } from "../constants/bulk.constants";

export const BulkIdsSchema = z
	.uuid()
	.array()
	.min(1)
	.max(BULK_MAX_IDS)
	.transform(ids => [...new Set(ids)]);
