import type z from "zod";

import { type UpdatePremiumGrantSchema } from "../schemas/update-premium-grant.schema";

export type UpdatePremiumGrantDto = z.infer<typeof UpdatePremiumGrantSchema>;
