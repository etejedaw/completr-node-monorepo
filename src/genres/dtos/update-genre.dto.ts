import z from "zod";
import { updateGenreSchema } from "../schemas/update-genre.schema";

export type UpdateGenreDto = z.infer<typeof updateGenreSchema>;
