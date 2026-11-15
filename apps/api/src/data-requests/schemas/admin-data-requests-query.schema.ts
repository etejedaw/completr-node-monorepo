import z from "zod";

import { PaginationQuerySchema } from "../../common/schemas/pagination-query.schema";
import {
	DATA_REQUEST_STATUSES,
	DATA_REQUEST_TYPES
} from "../data-requests.constants";

export const AdminDataRequestsQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		status: z.enum(DATA_REQUEST_STATUSES).optional(),
		type: z.enum(DATA_REQUEST_TYPES).optional()
	})
	.readonly();

export type AdminDataRequestsQuery = z.infer<
	typeof AdminDataRequestsQuerySchema
>;
