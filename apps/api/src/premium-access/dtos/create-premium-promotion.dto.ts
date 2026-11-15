import type z from "zod";

import { type CreatePremiumPromotionSchema } from "../schemas/create-premium-promotion.schema";

export type CreatePremiumPromotionDto = z.infer<
	typeof CreatePremiumPromotionSchema
>;
