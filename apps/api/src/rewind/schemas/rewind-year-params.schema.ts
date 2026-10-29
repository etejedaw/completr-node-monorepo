import z from "zod";

import { REWIND_MAX_YEAR, REWIND_MIN_YEAR } from "./rewind.constants";

const DIGITS_ONLY = /^\d+$/;

export const RewindYearParamsSchema = z
	.object({
		username: z.string().min(1),
		year: z
			.string()
			.regex(DIGITS_ONLY)
			.transform(Number)
			.pipe(z.number().int().min(REWIND_MIN_YEAR).max(REWIND_MAX_YEAR))
	})
	.strict()
	.readonly();

export type RewindYearParams = z.infer<typeof RewindYearParamsSchema>;
