import z from "zod";

import { REWIND_DESIGNS } from "../rewind-editions.constants";

export const REWIND_EDITION_MIN_YEAR = 2000;
export const REWIND_EDITION_MAX_YEAR = 2100;
export const REWIND_EDITION_MAX_REGENERATIONS = 1000;

const EditionDateSchema = z.iso.date();
const RegenerationsSchema = z
	.number()
	.int()
	.min(0)
	.max(REWIND_EDITION_MAX_REGENERATIONS);

const EditionPeriodShape = {
	opensAt: EditionDateSchema,
	closesAt: EditionDateSchema,
	graceStartsAt: EditionDateSchema,
	graceEndsAt: EditionDateSchema,
	design: z.enum(REWIND_DESIGNS),
	premiumRegenerations: RegenerationsSchema,
	giftRegenerations: RegenerationsSchema
};

interface EditionDates {
	opensAt: string;
	closesAt: string;
	graceStartsAt: string;
	graceEndsAt: string;
}

function hasOrderedDates(dates: EditionDates) {
	return (
		dates.opensAt <= dates.graceStartsAt &&
		dates.graceStartsAt <= dates.graceEndsAt &&
		dates.graceEndsAt <= dates.closesAt
	);
}

export const RewindEditionYearParamsSchema = z
	.object({
		year: z.coerce
			.number()
			.int()
			.min(REWIND_EDITION_MIN_YEAR)
			.max(REWIND_EDITION_MAX_YEAR)
	})
	.readonly();

export const CreateRewindEditionSchema = z
	.object({
		year: z
			.number()
			.int()
			.min(REWIND_EDITION_MIN_YEAR)
			.max(REWIND_EDITION_MAX_YEAR),
		...EditionPeriodShape
	})
	.strict()
	.refine(hasOrderedDates, { path: ["graceStartsAt"] });

export const UpdateRewindEditionSchema = z
	.object({
		...EditionPeriodShape,
		applyToGenerated: z.boolean().optional()
	})
	.strict()
	.refine(hasOrderedDates, { path: ["graceStartsAt"] });

export type RewindEditionYearParams = z.infer<
	typeof RewindEditionYearParamsSchema
>;
export type CreateRewindEditionDto = z.infer<typeof CreateRewindEditionSchema>;
export type UpdateRewindEditionDto = z.infer<typeof UpdateRewindEditionSchema>;
