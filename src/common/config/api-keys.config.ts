import z from "zod";

const optionalApiKey = z
	.string()
	.trim()
	.optional()
	.transform(value => value || undefined);

const ApiKeysConfigSchema = z
	.object({
		RAWG_API_KEY: optionalApiKey
	})
	.readonly();

export const apiKeysConfig = ApiKeysConfigSchema.parse(process.env);
