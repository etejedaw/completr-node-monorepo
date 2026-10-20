import { SafeTextSchema } from "../../common/schemas/safe-text.schema";

export const DisplayNameSchema = SafeTextSchema.min(4).max(80);
