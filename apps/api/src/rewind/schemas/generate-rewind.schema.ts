import z from "zod";

import { REWIND_LANGUAGES } from "../rewind.constants";

export const GenerateRewindSchema = z
	.object({
		language: z.enum(REWIND_LANGUAGES),
		includePrivateRuns: z.boolean(),
		includeNotes: z.boolean(),
		expectedGeneratedAt: z.iso.datetime({ offset: true }).nullable()
	})
	.strict();
