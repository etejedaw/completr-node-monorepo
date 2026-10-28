export interface GenerateTextRequest {
	instructions: string;
	content: string;
	maxTokens?: number;
	temperature?: number;
	timeoutMs?: number;
}

export interface GenerateTextResult {
	text: string;
	truncated: boolean;
}
