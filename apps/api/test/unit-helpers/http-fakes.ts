import { type Request, type Response } from "express";

import { asModel } from "./as-model";

export function fakeRequest(
	overrides: { originalUrl?: string; correlationId?: string } = {}
) {
	return asModel<Request>({
		originalUrl: overrides.originalUrl ?? "/test",
		locals: { correlationId: overrides.correlationId ?? "corr-1" }
	});
}

export function fakeResponse() {
	const captured: { status?: number; body?: Record<string, unknown> } = {};
	const response = {
		status(code: number) {
			captured.status = code;
			return response;
		},
		json(body: Record<string, unknown>) {
			captured.body = body;
			return response;
		}
	};
	return { response: asModel<Response>(response), captured };
}
