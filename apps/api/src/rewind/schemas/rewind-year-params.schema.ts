import z from "zod";

import { RewindYearSchema } from "./rewind-year.schema";

export const RewindYearParamsSchema = z
	.object({
		username: z.string().min(1),
		year: RewindYearSchema
	})
	.strict()
	.readonly();

export type RewindYearParams = z.infer<typeof RewindYearParamsSchema>;
