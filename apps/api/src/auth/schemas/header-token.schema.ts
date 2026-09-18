import z from "zod";

export const HeaderTokenSchema = z
	.object({
		authorization: z.string().regex(/^(Bearer) \S+$/)
	})
	.readonly();

export type HeaderToken = z.infer<typeof HeaderTokenSchema>;
