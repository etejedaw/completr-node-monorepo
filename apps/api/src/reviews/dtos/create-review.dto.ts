import type z from "zod";

import { type CreateReviewSchema } from "../schemas/create-review.schema";

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
