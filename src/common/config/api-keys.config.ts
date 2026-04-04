import z from "zod";

const ApiKeysConfigSchema = z
	.object({
		RAWG_API_KEY: z.string().default("")
	})
	.readonly();

export const apiKeysConfig = ApiKeysConfigSchema.parse(process.env);
