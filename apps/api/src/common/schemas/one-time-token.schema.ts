import z from "zod";

export const OneTimeTokenSchema = z
	.string()
	.regex(/^[a-f0-9]{64}$/, "Invalid or malformed token");
