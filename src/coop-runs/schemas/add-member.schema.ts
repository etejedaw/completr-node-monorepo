import z from "zod";

export const AddMemberSchema = z
	.object({
		userId: z.uuid(),
		targetBacklogId: z.uuid().optional()
	})
	.strict()
	.readonly();
