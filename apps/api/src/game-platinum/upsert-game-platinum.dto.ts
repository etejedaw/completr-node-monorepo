import type z from "zod";

import { type UpsertGamePlatinumSchema } from "./schemas/upsert-game-platinum.schema";

export type UpsertGamePlatinumDto = z.infer<typeof UpsertGamePlatinumSchema>;
