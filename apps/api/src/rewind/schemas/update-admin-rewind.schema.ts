import z from "zod";

import { REWIND_EDITION_MAX_REGENERATIONS } from "../../rewind-editions/rewind-editions.constants";

export const UpdateAdminRewindSchema = z
	.object({
		regenerationsLeft: z
			.number()
			.int()
			.min(0)
			.max(REWIND_EDITION_MAX_REGENERATIONS)
	})
	.strict();
