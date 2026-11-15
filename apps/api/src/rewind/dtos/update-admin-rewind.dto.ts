import type z from "zod";

import { type UpdateAdminRewindSchema } from "../schemas/update-admin-rewind.schema";

export type UpdateAdminRewindDto = z.infer<typeof UpdateAdminRewindSchema>;
