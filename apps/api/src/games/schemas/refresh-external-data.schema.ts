import z from "zod";

import { EXTERNAL_DATA_SOURCES } from "../services/external-data-sources.service";

export const RefreshExternalDataSchema = z
	.object({
		sources: z
			.array(z.enum(EXTERNAL_DATA_SOURCES))
			.min(1)
			.refine(sources => new Set(sources).size === sources.length, {
				message: "Sources must not repeat"
			})
	})
	.strict()
	.readonly();
