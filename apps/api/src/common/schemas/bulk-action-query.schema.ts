import z from "zod";

export function buildBulkActionQuerySchema<
	const Actions extends readonly [string, ...string[]]
>(actions: Actions) {
	return z.object({ action: z.enum(actions) }).readonly();
}

export type BulkActionQuery = z.infer<
	ReturnType<typeof buildBulkActionQuerySchema>
>;
