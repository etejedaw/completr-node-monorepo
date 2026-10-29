import z from "zod";

import { REWIND_LANGUAGES } from "../rewind.interface";

export const GenerateRewindSchema = z
	.object({
		language: z.enum(REWIND_LANGUAGES),
		includePrivateRuns: z.boolean(),
		expectedGeneratedAt: z.iso.datetime({ offset: true }).nullable()
	})
	.strict();
