import z from "zod";

import { hasOrderedRewindEditionDates } from "../utils/has-ordered-rewind-edition-dates.util";
import { RewindEditionPeriodShape } from "./rewind-edition-period.schema";

export const UpdateRewindEditionSchema = z
	.object({
		...RewindEditionPeriodShape,
		applyToGenerated: z.boolean().optional()
	})
	.strict()
	.refine(hasOrderedRewindEditionDates, { path: ["graceStartsAt"] });
