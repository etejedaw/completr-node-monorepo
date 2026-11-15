import type z from "zod";

import { type CreatePremiumGrantSchema } from "../schemas/create-premium-grant.schema";

export type CreatePremiumGrantDto = z.infer<typeof CreatePremiumGrantSchema>;
