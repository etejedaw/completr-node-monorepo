import type z from "zod";

import { type RegisterGenreSchema } from "../schemas/register-genre.schema";

export type RegisterGenreDto = z.infer<typeof RegisterGenreSchema>;
