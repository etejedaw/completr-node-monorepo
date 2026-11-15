import z from "zod";

import { PaginationQuerySchema } from "../common/schemas/pagination-query.schema";

export const AuditQuerySchema = PaginationQuerySchema.unwrap()
	.extend({
		action: z.string().min(1).max(50).optional(),
		targetType: z.string().min(1).max(50).optional()
	})
	.strict()
	.readonly();

export type AuditQuery = z.infer<typeof AuditQuerySchema>;
