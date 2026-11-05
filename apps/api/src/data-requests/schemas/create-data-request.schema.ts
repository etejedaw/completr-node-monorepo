import z from "zod";

import { DATA_REQUEST_TYPES } from "../data-requests.constants";

export const CreateDataRequestSchema = z
	.object({
		type: z.enum(DATA_REQUEST_TYPES)
	})
	.strict()
	.readonly();
