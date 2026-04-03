import z from "zod";
import { RegisterGenreSchema } from "../schemas/register-genre.schema";

export type RegisterGenreDto = z.infer<typeof RegisterGenreSchema>;
