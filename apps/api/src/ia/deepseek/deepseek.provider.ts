import * as iaServiceError from "../errors/ia.service-error";
import {
	type GenerateTextRequest,
	type GenerateTextResult
} from "../ia.interface";
import {
	type DeepseekChatCompletionResponse,
	type DeepseekSettings
} from "./deepseek.interface";

const CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";
const TIMEOUT_ERROR_NAMES = new Set(["TimeoutError", "AbortError"]);

export abstract class DeepseekClient {
	abstract readonly isEnabled: boolean;

	static create(
		settings: Omit<DeepseekSettings, "apiKey"> & {
			apiKey?: string;
		}
	): DeepseekClient {
		if (!settings.apiKey) return new DisabledDeepseekProvider();
		return new DeepseekProvider({ ...settings, apiKey: settings.apiKey });
	}

	abstract generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult>;
}

export class DeepseekProvider extends DeepseekClient {
	readonly isEnabled = true;

	constructor(private readonly settings: DeepseekSettings) {
		super();
	}

	async generateText(
		request: GenerateTextRequest
	): Promise<GenerateTextResult> {
		const timeoutMs = request.timeoutMs ?? this.settings.timeoutMs;
		const response = await this.fetchCompletion(request, timeoutMs);
		this.handleErrors(response);
		const body = await this.parseBody(response);
		return this.extractResult(body);
	}

	private async fetchCompletion(
		request: GenerateTextRequest,
		timeoutMs: number
	): Promise<Response> {
		try {
			return await fetch(CHAT_COMPLETIONS_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.settings.apiKey}`
				},
				body: JSON.stringify(this.buildPayload(request)),
				signal: AbortSignal.timeout(timeoutMs)
			});
		} catch (error) {
			throw this.transportError(error, "before a response");
		}
	}

	private buildPayload(request: GenerateTextRequest) {
		return {
			model: this.settings.model,
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

	private handleErrors(response: Response): void {
		if (response.ok) return;
		throw iaServiceError.providerUnavailableError(
			`DeepSeek API returned ${response.status}: ${response.statusText}`
		);
	}

	private async parseBody(
		response: Response
	): Promise<DeepseekChatCompletionResponse> {
		try {
			return (await response.json()) as DeepseekChatCompletionResponse;
		} catch (error) {
			if (this.isTimeout(error))
				throw this.transportError(error, "while reading");
			throw iaServiceError.invalidResponseError(error);
		}
	}

	private extractResult(
		body: DeepseekChatCompletionResponse | null
	): GenerateTextResult {
		const choice = body?.choices?.[0];
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

	private transportError(error: unknown, moment: string) {
		if (this.isTimeout(error)) return iaServiceError.timeoutError(error);
		const reason = error instanceof Error ? error.message : "unknown";
		return iaServiceError.providerUnavailableError(
			`DeepSeek request failed ${moment}: ${reason}`
		);
	}

	private isTimeout(error: unknown): boolean {
		return error instanceof Error && TIMEOUT_ERROR_NAMES.has(error.name);
	}
}

export class DisabledDeepseekProvider extends DeepseekClient {
	readonly isEnabled = false;

	generateText(): Promise<GenerateTextResult> {
		return Promise.reject(iaServiceError.notConfiguredError());
	}
}
