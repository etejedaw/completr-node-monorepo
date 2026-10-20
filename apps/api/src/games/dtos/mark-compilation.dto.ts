import type z from "zod";

import { type MarkCompilationSchema } from "../schemas/mark-compilation.schema";

export type MarkCompilationDto = z.infer<typeof MarkCompilationSchema>;
