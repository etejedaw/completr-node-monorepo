import type z from "zod";

import { type UpdateFranchiseSchema } from "../schemas/update-franchise.schema";

export type UpdateFranchiseDto = z.infer<typeof UpdateFranchiseSchema>;
