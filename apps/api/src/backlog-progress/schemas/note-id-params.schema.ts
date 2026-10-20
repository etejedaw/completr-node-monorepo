import z from "zod";

export const NoteIdParamsSchema = z
	.object({
		backlogId: z.uuid(),
		noteId: z.uuid()
	})
	.strict()
	.readonly();

export type NoteIdParams = z.infer<typeof NoteIdParamsSchema>;
