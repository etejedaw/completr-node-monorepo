import OpenAI, { APIConnectionTimeoutError, APIError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { type ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import {
	type Response as DeepseekResponse,
	type ResponseCreateParamsNonStreaming
} from "openai/resources/responses/responses";

import * as iaServiceError from "../errors/ia.service-error";
import {
	type GenerateJsonModelRequest,
	type GenerateTextRequest,
	type GenerateTextResult,
	type IaModel
} from "../ia.interface";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const TIMEOUT_ERROR_NAMES = new Set(["TimeoutError", "AbortError"]);

function fetchFromGlobalScope(
	input: string | URL | Request,
	init?: RequestInit
): Promise<Response> {
	return globalThis.fetch(input, init);
}

type DeepseekChatParams = ChatCompletionCreateParamsNonStreaming & {
	thinking: { type: "disabled" };
};

export abstract class DeepseekModel implements IaModel {
	abstract readonly isEnabled: boolean;

	static create(apiKey?: string): DeepseekModel {
		if (!apiKey) return new DisabledDeepseekProvider();
		return new DeepseekProvider(apiKey);
	}

	abstract generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult>;

	abstract generateJson(
		request: GenerateJsonModelRequest
	): Promise<GenerateTextResult>;
}

export class DeepseekProvider extends DeepseekModel {
	readonly isEnabled = true;

	private readonly MODEL = "deepseek-flash";
	private readonly TIMEOUT_MS = 30_000;
	private readonly MAX_RETRIES = 0;
	private readonly client: OpenAI;

	constructor(
		apiKey: string,
		fetchImplementation: typeof fetch = fetchFromGlobalScope
	) {
		super();
		this.client = new OpenAI({
			apiKey,
			baseURL: DEEPSEEK_BASE_URL,
			maxRetries: this.MAX_RETRIES,
			timeout: this.TIMEOUT_MS,
			fetch: fetchImplementation
		});
	}

	async generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult> {
		const completion = await this.send(
			() =>
				this.client.chat.completions.create(
					this.buildPayload(request),
					{
						timeout: request.timeoutMs ?? this.TIMEOUT_MS
					}
				),
			"chat completion"
		);
		const choice = Array.isArray(completion?.choices)
			? completion.choices[0]
			: undefined;
		const text = choice?.message?.content;
		if (typeof text !== "string" || !text.trim())
			throw iaServiceError.invalidResponseError(
				`DeepSeek returned no text (finish_reason: ${choice?.finish_reason ?? "none"})`
			);
		return {
			text: text.trim(),
			truncated: choice?.finish_reason === "length"
		};
	}

	async generateJson(
		request: GenerateJsonModelRequest
	): Promise<GenerateTextResult> {
		const response = await this.send(
			() =>
				this.client.responses.create(this.buildJsonPayload(request), {
					timeout: request.timeoutMs ?? this.TIMEOUT_MS
				}),
			"response"
		);
		const text = this.joinOutputText(response);
		if (!text.trim())
			throw iaServiceError.invalidResponseError(
				`DeepSeek returned no text (status: ${response?.status ?? "none"}, reason: ${response?.incomplete_details?.reason ?? "none"})`
			);
		return {
			text: text.trim(),
			truncated: response?.status === "incomplete"
		};
	}

	private buildPayload(request: GenerateTextRequest): DeepseekChatParams {
		return {
			model: this.MODEL,
			messages: [
				{ role: "system", content: request.instructions },
				{ role: "user", content: request.content }
			],
			thinking: { type: "disabled" },
			stream: false,
			...(request.maxTokens !== undefined && {
				max_tokens: request.maxTokens
			}),
			...(request.temperature !== undefined && {
				temperature: request.temperature
			})
		};
	}

	private buildJsonPayload(
		request: GenerateJsonModelRequest
	): ResponseCreateParamsNonStreaming {
		return {
			model: this.MODEL,
			instructions: request.instructions,
			input: request.content,
			reasoning: { effort: "none" },
			text: { format: zodTextFormat(request.schema, request.schemaName) },
			stream: false,
			...(request.maxTokens !== undefined && {
				max_output_tokens: request.maxTokens
			}),
			...(request.temperature !== undefined && {
				temperature: request.temperature
			})
		};
	}

	private joinOutputText(response: DeepseekResponse | null): string {
		const output: unknown = response?.output;
		if (!Array.isArray(output)) return "";
		return (output as DeepseekResponse["output"])
			.flatMap(item =>
				item?.type === "message" && Array.isArray(item.content)
					? item.content
					: []
			)
			.map(part =>
				part?.type === "output_text" && typeof part.text === "string"
					? part.text
					: ""
			)
			.join("");
	}

	private async send<TBody>(
		call: () => Promise<TBody>,
		operation: string
	): Promise<TBody | null> {
		try {
			return await call();
		} catch (error) {
			throw this.toServiceError(error, operation);
		}
	}

	private toServiceError(error: unknown, operation: string) {
		if (this.isTimeout(error)) return iaServiceError.timeoutError(error);
		if (error instanceof APIError)
			return iaServiceError.providerUnavailableError(
				`DeepSeek ${operation} failed${error.status ? ` with ${error.status}` : ""}: ${error.message}`
			);
		return iaServiceError.invalidResponseError(error);
	}

	private isTimeout(error: unknown): boolean {
		if (error instanceof APIConnectionTimeoutError) return true;
		return error instanceof Error && TIMEOUT_ERROR_NAMES.has(error.name);
	}
}

export class DisabledDeepseekProvider extends DeepseekModel {
	readonly isEnabled = false;

	generateText(): Promise<GenerateTextResult> {
		return Promise.reject(iaServiceError.notConfiguredError());
	}

	generateJson(): Promise<GenerateTextResult> {
		return Promise.reject(iaServiceError.notConfiguredError());
	}
}
