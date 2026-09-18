import z from "zod";

export const SafeTextSchema = z
	.string()
	.regex(/^[^<>]*$/, "must not contain < or > characters");
