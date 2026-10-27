import z from "zod";

export const EXPORT_FORMATS = ["csv", "json"] as const;

export const ExportFormatQuerySchema = z
	.object({
		format: z.enum(EXPORT_FORMATS).default("csv")
	})
	.readonly();

export type ExportFormatQuery = z.infer<typeof ExportFormatQuerySchema>;
