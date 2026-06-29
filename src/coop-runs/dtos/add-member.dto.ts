import type z from "zod";

import { type AddMemberSchema } from "../schemas/add-member.schema";

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
