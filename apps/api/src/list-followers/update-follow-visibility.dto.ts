import type z from "zod";

import { type UpdateFollowVisibilitySchema } from "./schemas/update-follow-visibility.schema";

export type UpdateFollowVisibilityDto = z.infer<
	typeof UpdateFollowVisibilitySchema
>;
