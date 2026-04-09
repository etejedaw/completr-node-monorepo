import z from "zod";
import { ReplaceFavoritesSchema } from "../schemas/replace-favorites.schema";

export type ReplaceFavoritesDto = z.infer<typeof ReplaceFavoritesSchema>;
