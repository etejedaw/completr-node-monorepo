import { type ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";

export type DeepseekChatParams = ChatCompletionCreateParamsNonStreaming & {
	thinking: { type: "disabled" };
};
