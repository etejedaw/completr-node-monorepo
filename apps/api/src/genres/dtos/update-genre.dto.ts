import type z from "zod";

import { type UpdateGenreSchema } from "../schemas/update-genre.schema";

export type UpdateGenreDto = z.infer<typeof UpdateGenreSchema>;
