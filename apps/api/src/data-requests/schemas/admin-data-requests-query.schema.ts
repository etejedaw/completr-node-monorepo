import z from "zod";

import {
	DATA_REQUEST_STATUSES,
	DATA_REQUEST_TYPES
} from "../data-requests.constants";

export const AdminDataRequestsQuerySchema = z
	.object({
		status: z.enum(DATA_REQUEST_STATUSES).optional(),
		type: z.enum(DATA_REQUEST_TYPES).optional(),
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional()
	})
	.readonly();

export type AdminDataRequestsQuery = z.infer<
	typeof AdminDataRequestsQuerySchema
>;
