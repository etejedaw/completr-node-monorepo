import z from "zod";

import { REWIND_EDITION_MAX_REGENERATIONS } from "../../rewind-editions/schemas/rewind-editions-admin.schemas";
import { RewindYearSchema } from "./rewind-year.schema";

export const ADMIN_REWINDS_QUERY_MAX_LENGTH = 100;

export const AdminRewindsQuerySchema = z
	.object({
		year: RewindYearSchema.optional(),
		q: z
			.string()
			.trim()
			.max(ADMIN_REWINDS_QUERY_MAX_LENGTH)
			.transform(value => (value.length > 0 ? value : undefined))
			.optional(),
		limit: z.coerce.number().int().min(1).max(100).optional(),
		offset: z.coerce.number().int().min(0).optional()
	})
	.strict()
	.readonly();

export const AdminRewindParamsSchema = z
	.object({ rewindId: z.uuid() })
	.readonly();

export const UpdateAdminRewindSchema = z
	.object({
		regenerationsLeft: z
			.number()
			.int()
			.min(0)
			.max(REWIND_EDITION_MAX_REGENERATIONS)
	})
	.strict();

export type AdminRewindsQuery = z.infer<typeof AdminRewindsQuerySchema>;
export type AdminRewindParams = z.infer<typeof AdminRewindParamsSchema>;
export type UpdateAdminRewindDto = z.infer<typeof UpdateAdminRewindSchema>;
