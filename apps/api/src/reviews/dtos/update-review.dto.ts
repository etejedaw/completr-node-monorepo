import type z from "zod";

import { type UpdateReviewSchema } from "../schemas/update-review.schema";

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;
