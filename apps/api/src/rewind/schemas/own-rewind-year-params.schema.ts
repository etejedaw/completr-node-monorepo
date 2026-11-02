import z from "zod";

import { RewindYearSchema } from "./rewind-year.schema";

export const OwnRewindYearParamsSchema = z
	.object({ year: RewindYearSchema })
	.strict()
	.readonly();

export type OwnRewindYearParams = z.infer<typeof OwnRewindYearParamsSchema>;
