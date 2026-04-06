import z from "zod";

const ApiKeysConfigSchema = z
	.object({
		RAWG_API_KEY: z.string().min(1)
	})
	.readonly();

export const apiKeysConfig = ApiKeysConfigSchema.parse(process.env);
