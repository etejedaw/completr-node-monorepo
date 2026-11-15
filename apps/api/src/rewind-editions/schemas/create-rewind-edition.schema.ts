import z from "zod";

import {
	REWIND_MAX_YEAR,
	REWIND_MIN_YEAR
} from "../../rewind/rewind.constants";
import { hasOrderedRewindEditionDates } from "../utils/has-ordered-rewind-edition-dates.util";
import { RewindEditionPeriodShape } from "./rewind-edition-period.schema";

export const CreateRewindEditionSchema = z
	.object({
		year: z.number().int().min(REWIND_MIN_YEAR).max(REWIND_MAX_YEAR),
		...RewindEditionPeriodShape
	})
	.strict()
	.refine(hasOrderedRewindEditionDates, { path: ["graceStartsAt"] });
