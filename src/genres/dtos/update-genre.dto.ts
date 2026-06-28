import z from "zod";

import { UpdateGenreSchema } from "../schemas/update-genre.schema";

export type UpdateGenreDto = z.infer<typeof UpdateGenreSchema>;
