import type z from "zod";

import { type AcceptInvitationSchema } from "../schemas/accept-invitation.schema";

export type AcceptInvitationDto = z.infer<typeof AcceptInvitationSchema>;
