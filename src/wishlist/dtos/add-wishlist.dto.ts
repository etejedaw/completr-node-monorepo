import z from "zod";
import { AddWishlistBodySchema } from "../schemas/add-wishlist-body.schema";

export type AddWishlistDto = z.infer<typeof AddWishlistBodySchema>;
