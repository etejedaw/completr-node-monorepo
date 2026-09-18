import z from "zod";

const SplitVariantEntry = z
	.object({
		title: z.string().max(200).nonempty(),
		variant: z.string().max(100).nonempty()
	})
	.strict();

export const SplitGameSchema = z
	.object({
		variants: z.array(SplitVariantEntry).min(2).max(10)
	})
	.strict()
	.readonly();

export type SplitGameDto = z.infer<typeof SplitGameSchema>;
