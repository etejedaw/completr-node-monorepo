import type z from "zod";

import { type CreatePremiumPromotionSchema } from "../schemas/premium-promotion.schemas";

export type CreatePremiumPromotionDto = z.infer<
	typeof CreatePremiumPromotionSchema
>;
