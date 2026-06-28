import z from "zod";

import { ReplaceWishlistSchema } from "../schemas/replace-wishlist.schema";

export type ReplaceWishlistDto = z.infer<typeof ReplaceWishlistSchema>;
