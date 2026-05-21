import z from "zod";

const CompilationItemLink = z
	.object({
		mode: z.literal("link"),
		gameId: z.uuid()
	})
	.strict();

const CompilationItemCreate = z
	.object({
		mode: z.literal("create"),
		title: z.string().max(200).nonempty()
	})
	.strict();

const CompilationItemEntry = z.discriminatedUnion("mode", [
	CompilationItemLink,
	CompilationItemCreate
]);

export const MarkCompilationSchema = z
	.object({
		items: z.array(CompilationItemEntry).min(1).max(50)
	})
	.strict()
	.readonly();

export type MarkCompilationDto = z.infer<typeof MarkCompilationSchema>;
