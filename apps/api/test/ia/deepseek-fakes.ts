import { mock } from "node:test";

export const API_KEY = "fake-key";

export type FetchCall = { url: string; init: RequestInit };

export function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" }
	});
}

export function completion(content: unknown, finishReason = "stop") {
	return {
		id: "chat-1",
		object: "chat.completion",
		choices: [
			{
				index: 0,
				finish_reason: finishReason,
				message: { role: "assistant", content }
			}
		]
	};
}

export function responsesBody(text: string, status = "completed") {
	return {
		id: "resp-1",
		object: "response",
		status,
		incomplete_details:
			status === "incomplete" ? { reason: "max_output_tokens" } : null,
		output: [
			{
				type: "message",
				role: "assistant",
				content: [{ type: "output_text", text }]
			}
		],
		usage: { input_tokens: 10, output_tokens: 20 }
	};
}

export function scriptedFetch(
	...replies: (() => Response | Promise<Response>)[]
) {
	let index = 0;
	return mock.fn(
		async (_url: string | URL | Request, _init?: RequestInit) => {
			const reply = replies[Math.min(index, replies.length - 1)];
			index += 1;
			if (!reply) throw new Error("scriptedFetch needs a reply");
			return await reply();
		}
	);
}

export function replyWith(...bodies: Response[]) {
	return scriptedFetch(...bodies.map(body => () => body.clone()));
}

export function hangingFetch() {
	return mock.fn(
		(_url: string | URL | Request, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () =>
					reject(
						init.signal?.reason ??
							new DOMException("aborted", "AbortError")
					)
				);
			})
	);
}

export function sentCall(
	fetchMock: ReturnType<typeof scriptedFetch>,
	call = 0
): FetchCall {
	const [url, init] = fetchMock.mock.calls[call]?.arguments ?? [];
	return { url: String(url), init: init ?? {} };
}

export function sentBody(
	fetchMock: ReturnType<typeof scriptedFetch>,
	call = 0
) {
	return JSON.parse(String(sentCall(fetchMock, call).init.body)) as Record<
		string,
		unknown
	>;
}

export function sentHeader(
	fetchMock: ReturnType<typeof scriptedFetch>,
	name: string
) {
	return new Headers(sentCall(fetchMock).init.headers).get(name);
}
