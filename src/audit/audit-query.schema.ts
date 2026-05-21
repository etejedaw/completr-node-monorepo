import z from "zod";

export const AuditQuerySchema = z
	.object({
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional(),
		action: z.string().min(1).max(50).optional(),
		targetType: z.string().min(1).max(50).optional()
	})
	.strict()
	.readonly();

export type AuditQuery = z.infer<typeof AuditQuerySchema>;
