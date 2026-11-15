import z from "zod";

import {
	REWIND_DESIGNS,
	REWIND_EDITION_MAX_REGENERATIONS
} from "../rewind-editions.constants";

const EditionDateSchema = z.iso.date();
const RegenerationsSchema = z
	.number()
	.int()
	.min(0)
	.max(REWIND_EDITION_MAX_REGENERATIONS);

export const RewindEditionPeriodShape = {
	opensAt: EditionDateSchema,
	closesAt: EditionDateSchema,
	graceStartsAt: EditionDateSchema,
	graceEndsAt: EditionDateSchema,
	design: z.enum(REWIND_DESIGNS),
	premiumRegenerations: RegenerationsSchema,
	giftRegenerations: RegenerationsSchema
};
