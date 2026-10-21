/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Request } from "express";

import { getDeviceInfo } from "../../../src/auth/utils/device-info.util";
import { asModel } from "../../unit-helpers/as-model";

function requestWithUserAgent(userAgent?: string) {
	return asModel<Request>({
		headers: userAgent ? { "user-agent": userAgent } : {}
	});
}

describe("getDeviceInfo", () => {
	it("returns the user agent header", () => {
		assert.equal(
			getDeviceInfo(requestWithUserAgent("Mozilla/5.0")),
			"Mozilla/5.0"
		);
	});

	it("falls back to Unknown device without a user agent", () => {
		assert.equal(getDeviceInfo(requestWithUserAgent()), "Unknown device");
	});

	it("truncates the user agent to 500 characters", () => {
		assert.equal(
			getDeviceInfo(requestWithUserAgent("a".repeat(900))).length,
			500
		);
	});
});
