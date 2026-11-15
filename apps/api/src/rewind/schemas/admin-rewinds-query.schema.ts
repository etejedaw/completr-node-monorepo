import type z from "zod";

import { PaginatedSearchQuerySchema } from "../../common/schemas/paginated-search-query.schema";
import { RewindYearSchema } from "./rewind-year.schema";

export const AdminRewindsQuerySchema = PaginatedSearchQuerySchema.unwrap()
	.extend({ year: RewindYearSchema.optional() })
	.strict()
	.readonly();

export type AdminRewindsQuery = z.infer<typeof AdminRewindsQuerySchema>;
