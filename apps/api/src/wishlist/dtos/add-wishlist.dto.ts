import type z from "zod";

import { type AddWishlistSchema } from "../schemas/add-wishlist.schema";

export type AddWishlistDto = z.infer<typeof AddWishlistSchema>;
