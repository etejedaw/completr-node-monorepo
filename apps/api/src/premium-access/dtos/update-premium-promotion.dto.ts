import type z from "zod";

import { type UpdatePremiumPromotionSchema } from "../schemas/premium-promotion.schemas";

export type UpdatePremiumPromotionDto = z.infer<
	typeof UpdatePremiumPromotionSchema
>;
