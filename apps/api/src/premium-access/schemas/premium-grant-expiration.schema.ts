import z from "zod";

export const PremiumGrantExpirationSchema = z.iso
	.datetime({ offset: true })
	.nullable();
