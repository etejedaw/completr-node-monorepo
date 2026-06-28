import z from "zod";

import { AddMemberSchema } from "../schemas/add-member.schema";

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
