import z from "zod";

import { hasAtMostTwoDecimals } from "../utils/has-at-most-two-decimals.util";

export const BacklogScoreSchema = z
	.number()
	.positive()
	.max(5)
	.refine(hasAtMostTwoDecimals, {
		error: "score must have at most 2 decimal places"
	});

export const BacklogDurationSchema = z
	.number()
	.positive()
	.refine(hasAtMostTwoDecimals, {
		error: "duration must have at most 2 decimal places"
	});
