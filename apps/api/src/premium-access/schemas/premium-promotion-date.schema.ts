import z from "zod";

export const PremiumPromotionDateSchema = z.iso.datetime({ offset: true });
