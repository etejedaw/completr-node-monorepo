import { type z } from "zod";

import { apiKeysConfig } from "../common/config/api-keys.config";
import { DeepseekModel } from "./deepseek/deepseek.provider";
import * as iaServiceError from "./errors/ia.service-error";
import {
	type GenerateJsonRequest,
	type GenerateTextRequest,
	type GenerateTextResult,
	type IaModel
} from "./ia.interface";

const MAX_TEMPERATURE = 2;

export class IaProvider {
	constructor(private readonly model: IaModel) {}

	get isConfigured(): boolean {
		return this.model.isEnabled;
	}

	async generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult> {
		const invalidReason = this.findInvalidReason(request);
		if (invalidReason)
			throw iaServiceError.invalidInputError(invalidReason);

		return await this.model.generateText({
			...request,
			instructions: request.instructions.trim(),
			content: request.content.trim()
		});
	}

	generateJson<T>(
		_schema: z.ZodType<T>,
		_request: GenerateJsonRequest
	): Promise<T> {
		return Promise.reject(new Error("generateJson is not implemented yet"));
	}

	private findInvalidReason(request: GenerateTextRequest): string | null {
		if (!request.instructions.trim()) return "instructions are blank";
		if (!request.content.trim()) return "content is blank";
		if (!this.isOptionalPositiveInteger(request.maxTokens))
			return "maxTokens must be a positive integer";
		if (!this.isOptionalPositiveInteger(request.timeoutMs))
			return "timeoutMs must be a positive integer";
		if (!this.isValidTemperature(request.temperature))
			return `temperature must be between 0 and ${MAX_TEMPERATURE}`;
		return null;
	}

	private isOptionalPositiveInteger(value: number | undefined): boolean {
		if (value === undefined) return true;
		return Number.isInteger(value) && value > 0;
	}

	private isValidTemperature(value: number | undefined): boolean {
		if (value === undefined) return true;
		return Number.isFinite(value) && value >= 0 && value <= MAX_TEMPERATURE;
	}
}

export const iaProvider = new IaProvider(
	DeepseekModel.create(apiKeysConfig.DEEPSEEK_API_KEY)
);
