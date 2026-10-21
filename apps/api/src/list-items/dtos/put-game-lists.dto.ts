import type z from "zod";

import { type PutGameListsSchema } from "../schemas/put-game-lists.schema";

export type PutGameListsDto = z.infer<typeof PutGameListsSchema>;
