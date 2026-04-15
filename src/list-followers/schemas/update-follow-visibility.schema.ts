import z from "zod";

export const UpdateFollowVisibilitySchema = z
	.object({
		isVisible: z.boolean()
	})
	.strict()
	.readonly();

export type UpdateFollowVisibilityBody = z.infer<
	typeof UpdateFollowVisibilitySchema
>;
