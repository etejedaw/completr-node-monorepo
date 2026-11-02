import { type z } from "zod";

export interface GenerateTextRequest {
	instructions: string;
	content: string;
	maxTokens?: number;
	temperature?: number;
	timeoutMs?: number;
}

export interface GenerateJsonRequest extends GenerateTextRequest {
	schemaName: string;
}

export interface GenerateJsonModelRequest extends GenerateJsonRequest {
	schema: z.ZodType;
}

export interface GenerateTextResult {
	text: string;
	truncated: boolean;
}

export interface IaModel {
	readonly isEnabled: boolean;
	generateText(request: GenerateTextRequest): Promise<GenerateTextResult>;
	generateJson(
		request: GenerateJsonModelRequest
	): Promise<GenerateTextResult>;
}
