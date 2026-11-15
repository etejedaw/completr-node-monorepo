import type z from "zod";

import { type UpdatePremiumPromotionSchema } from "../schemas/update-premium-promotion.schema";

export type UpdatePremiumPromotionDto = z.infer<
	typeof UpdatePremiumPromotionSchema
>;
