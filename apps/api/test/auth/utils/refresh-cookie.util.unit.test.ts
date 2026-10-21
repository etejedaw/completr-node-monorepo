/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Response } from "express";

import {
	clearRefreshCookie,
	REFRESH_COOKIE_NAME,
	setRefreshCookie
} from "../../../src/auth/utils/refresh-cookie.util";
import { environmentConfig } from "../../../src/common/config/environment.config";
import { asModel } from "../../unit-helpers/as-model";

function recordingResponse() {
	const calls: { method: string; args: unknown[] }[] = [];
	const response = asModel<Response>({
		cookie: (...args: unknown[]) => calls.push({ method: "cookie", args }),
		clearCookie: (...args: unknown[]) =>
			calls.push({ method: "clearCookie", args })
	});
	return { response, calls };
}

describe("setRefreshCookie", () => {
	it("stores the token in an HttpOnly cookie scoped to /auth", () => {
		const { response, calls } = recordingResponse();

		setRefreshCookie(response, "token-value");

		const [name, value, options] = calls[0]!.args as [
			string,
			string,
			Record<string, unknown>
		];
		assert.equal(name, REFRESH_COOKIE_NAME);
		assert.equal(value, "token-value");
		assert.equal(options.httpOnly, true);
		assert.equal(options.path, "/auth");
	});

	it("expires the cookie after the configured refresh token days", () => {
		const { response, calls } = recordingResponse();

		setRefreshCookie(response, "token-value");

		const options = calls[0]!.args[2] as { maxAge: number };
		assert.equal(
			options.maxAge,
			environmentConfig.REFRESH_TOKEN_TTL_DAYS * 86_400_000
		);
	});
});

describe("clearRefreshCookie", () => {
	it("clears the cookie using the same scope it was set with", () => {
		const { response, calls } = recordingResponse();

		clearRefreshCookie(response);

		const [name, options] = calls[0]!.args as [
			string,
			Record<string, unknown>
		];
		assert.equal(calls[0]!.method, "clearCookie");
		assert.equal(name, REFRESH_COOKIE_NAME);
		assert.equal(options.path, "/auth");
		assert.equal(options.httpOnly, true);
	});
});
