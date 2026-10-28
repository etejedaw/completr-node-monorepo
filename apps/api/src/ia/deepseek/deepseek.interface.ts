export interface DeepseekSettings {
	apiKey: string;
	model: string;
	timeoutMs: number;
}

export interface DeepseekChatCompletionResponse {
	choices?: {
		finish_reason?: string | null;
		message?: { content?: string | null };
	}[];
}
