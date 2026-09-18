import z from "zod";

export const SessionIdParamsSchema = z
	.object({
		sessionId: z.uuid()
	})
	.readonly();

export type SessionIdParams = z.infer<typeof SessionIdParamsSchema>;
