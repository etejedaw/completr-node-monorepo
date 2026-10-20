import type z from "zod";

import { type CreateInvitationSchema } from "../schemas/create-invitation.schema";

export type CreateInvitationDto = z.infer<typeof CreateInvitationSchema>;
