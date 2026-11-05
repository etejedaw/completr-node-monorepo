import z from "zod";

export const DataRequestIdParamSchema = z
	.object({
		requestId: z.uuid()
	})
	.readonly();

export type DataRequestIdParam = z.infer<typeof DataRequestIdParamSchema>;
