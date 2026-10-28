export interface DeepseekChatCompletionResponse {
	choices?: {
		finish_reason?: string | null;
		message?: { content?: string | null };
	}[];
}
