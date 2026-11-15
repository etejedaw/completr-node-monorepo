import z from "zod";

export const AdminRewindIdParamsSchema = z
	.object({ rewindId: z.uuid() })
	.readonly();

export type AdminRewindIdParam = z.infer<typeof AdminRewindIdParamsSchema>;
