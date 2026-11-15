import z from "zod";

import {
	REWIND_MAX_YEAR,
	REWIND_MIN_YEAR
} from "../../rewind/rewind.constants";

export const RewindEditionYearParamsSchema = z
	.object({
		year: z.coerce.number().int().min(REWIND_MIN_YEAR).max(REWIND_MAX_YEAR)
	})
	.readonly();

export type RewindEditionYearParam = z.infer<
	typeof RewindEditionYearParamsSchema
>;
