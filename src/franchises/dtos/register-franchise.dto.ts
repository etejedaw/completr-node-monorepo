import type z from "zod";

import { type RegisterFranchiseSchema } from "../schemas/register-franchise.schema";

export type RegisterFranchiseDto = z.infer<typeof RegisterFranchiseSchema>;
