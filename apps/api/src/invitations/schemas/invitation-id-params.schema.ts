import z from "zod";

export const InvitationIdParamSchema = z
	.object({
		invitationId: z.uuid()
	})
	.readonly();

export type InvitationIdParam = z.infer<typeof InvitationIdParamSchema>;
