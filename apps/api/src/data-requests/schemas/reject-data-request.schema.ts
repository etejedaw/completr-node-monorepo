import z from "zod";

import { REJECTION_REASON_MAX_LENGTH } from "../data-requests.constants";

export const RejectDataRequestSchema = z
	.object({
		reason: z.string().trim().min(1).max(REJECTION_REASON_MAX_LENGTH)
	})
	.strict()
	.readonly();
