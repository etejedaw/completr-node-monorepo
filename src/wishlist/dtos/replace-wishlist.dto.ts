import type z from "zod";

import { type ReplaceWishlistSchema } from "../schemas/replace-wishlist.schema";

export type ReplaceWishlistDto = z.infer<typeof ReplaceWishlistSchema>;
