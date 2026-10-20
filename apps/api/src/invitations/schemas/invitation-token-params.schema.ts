import z from "zod";

import { OneTimeTokenSchema } from "../../common/schemas/one-time-token.schema";

export const InvitationTokenParamSchema = z
	.object({
		token: OneTimeTokenSchema
	})
	.readonly();

export type InvitationTokenParam = z.infer<typeof InvitationTokenParamSchema>;
