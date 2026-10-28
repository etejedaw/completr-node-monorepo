import { environmentConfig } from "../common/config/environment.config";
import { DeepseekClient } from "./deepseek/deepseek.provider";
import * as iaServiceError from "./errors/ia.service-error";
import {
	type GenerateTextRequest,
	type GenerateTextResult
} from "./ia.interface";

const MAX_TEMPERATURE = 2;

const textGenerator = DeepseekClient.create({
	apiKey: environmentConfig.DEEPSEEK_API_KEY,
	model: environmentConfig.DEEPSEEK_MODEL,
	timeoutMs: environmentConfig.DEEPSEEK_TIMEOUT_MS
});

export function isIaConfigured(): boolean {
	return textGenerator.isEnabled;
}

export async function generateText(
	request: GenerateTextRequest
): Promise<GenerateTextResult> {
	const invalidReason = findInvalidReason(request);
	if (invalidReason) throw iaServiceError.invalidInputError(invalidReason);

	return await textGenerator.generateText({
		...request,
		instructions: request.instructions.trim(),
		content: request.content.trim()
	});
}

function findInvalidReason(request: GenerateTextRequest): string | null {
	if (!request.instructions.trim()) return "instructions are blank";
	if (!request.content.trim()) return "content is blank";
	if (!isOptionalPositiveInteger(request.maxTokens))
		return "maxTokens must be a positive integer";
	if (!isOptionalPositiveInteger(request.timeoutMs))
		return "timeoutMs must be a positive integer";
	if (!isValidTemperature(request.temperature))
		return `temperature must be between 0 and ${MAX_TEMPERATURE}`;
	return null;
}

function isOptionalPositiveInteger(value: number | undefined) {
	if (value === undefined) return true;
	return Number.isInteger(value) && value > 0;
}

function isValidTemperature(value: number | undefined) {
	if (value === undefined) return true;
	return Number.isFinite(value) && value >= 0 && value <= MAX_TEMPERATURE;
}
