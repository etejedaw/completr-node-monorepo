import z from "zod";
import { registerGenreSchema } from "../schemas/register-genre.schema";

export type RegisterGenreDto = z.infer<typeof registerGenreSchema>;
