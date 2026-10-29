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
import { type JsonOutcome } from "./ia.types";
import { parseJsonOutput } from "./utils/parse-json-output.util";

const MAX_TEMPERATURE = 2;
const JSON_ATTEMPTS = 3;
const SCHEMA_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

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

	async generateJson<T>(
		schema: z.ZodType<T>,
		request: GenerateJsonRequest
	): Promise<T> {
		const invalidReason =
			this.findInvalidReason(request) ??
			this.findInvalidSchemaNameReason(request.schemaName);
		if (invalidReason)
			throw iaServiceError.invalidInputError(invalidReason);

		const modelRequest = {
			...request,
			instructions: request.instructions.trim(),
			content: request.content.trim(),
			schemaName: request.schemaName.trim(),
			schema
		};

		const failures: string[] = [];
		for (let attempt = 1; attempt <= JSON_ATTEMPTS; attempt++) {
			const result = await this.model.generateJson(
				this.withRetryFeedback(modelRequest, failures)
			);
			const outcome = this.readJsonOutput(schema, result);
			if (outcome.ok) return outcome.data;
			failures.push(outcome.reason);
		}
		throw iaServiceError.invalidOutputError({
			schemaName: modelRequest.schemaName,
			failures
		});
	}

	private withRetryFeedback<Request extends { instructions: string }>(
		request: Request,
		failures: string[]
	): Request {
		const lastFailure = failures.at(-1);
		if (lastFailure === undefined) return request;
		return {
			...request,
			instructions: `${request.instructions}\n\nYour previous reply was rejected because ${lastFailure}. Reply again with a JSON object that fixes it and keeps every other rule; when a text was too long, rewrite it shorter instead of cutting it.`
		};
	}

	private readJsonOutput<T>(
		schema: z.ZodType<T>,
		result: GenerateTextResult
	): JsonOutcome<T> {
		if (result.truncated)
			return { ok: false, reason: "output was truncated" };

		let parsed: unknown;
		try {
			parsed = parseJsonOutput(result.text);
		} catch {
			return { ok: false, reason: "output is not valid JSON" };
		}

		const validation = schema.safeParse(parsed);
		if (validation.success) return { ok: true, data: validation.data };
		return {
			ok: false,
			reason: `output does not match the schema: ${this.describeIssues(validation.error)}`
		};
	}

	private describeIssues(error: z.ZodError): string {
		return error.issues
			.map(
				issue => `${issue.path.join(".") || "(root)"}: ${issue.message}`
			)
			.join("; ");
	}

	private findInvalidSchemaNameReason(schemaName: string): string | null {
		const trimmed = schemaName.trim();
		if (!trimmed) return "schemaName is blank";
		if (!SCHEMA_NAME_PATTERN.test(trimmed))
			return "schemaName must be 1-64 letters, digits, underscores or hyphens";
		return null;
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
