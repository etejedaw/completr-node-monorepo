import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Request } from "express";

import { resolveClientIp } from "../../../src/common/utils/client-ip.util";
import { asModel } from "../../unit-helpers/as-model";

const PROXY_IP = "172.18.0.4";
const HEADER = "cf-connecting-ip";

function requestWith(headers: Record<string, string | string[]>, ip?: string) {
	return asModel<Request>({ headers, ip });
}

void describe("resolveClientIp", () => {
	void it("uses request.ip when no header is configured", () => {
		const request = requestWith({ [HEADER]: "203.0.113.9" }, PROXY_IP);

		assert.equal(resolveClientIp(request, undefined), PROXY_IP);
	});

	void it("reads an IPv4 and an IPv6 address from the configured header", () => {
		assert.equal(
			resolveClientIp(
				requestWith({ [HEADER]: "203.0.113.9" }, PROXY_IP),
				HEADER
			),
			"203.0.113.9"
		);
		assert.equal(
			resolveClientIp(
				requestWith({ [HEADER]: "2001:db8::1" }, PROXY_IP),
				HEADER
			),
			"2001:db8::1"
		);
	});

	void it("trims the header value and takes the first of repeated headers", () => {
		assert.equal(
			resolveClientIp(
				requestWith({ [HEADER]: "  203.0.113.9 " }, PROXY_IP),
				HEADER
			),
			"203.0.113.9"
		);
		assert.equal(
			resolveClientIp(
				requestWith(
					{ [HEADER]: ["203.0.113.9", "198.51.100.1"] },
					PROXY_IP
				),
				HEADER
			),
			"203.0.113.9"
		);
	});

	void it("falls back to request.ip when the header is missing, empty or garbage", () => {
		const garbage = [
			"",
			"   ",
			"not-an-ip",
			"<script>alert(1)</script>",
			"999.999.999.999",
			"203.0.113.9, 198.51.100.1",
			"😀",
			"1".repeat(5000)
		];

		assert.equal(
			resolveClientIp(requestWith({}, PROXY_IP), HEADER),
			PROXY_IP
		);
		for (const value of garbage) {
			assert.equal(
				resolveClientIp(
					requestWith({ [HEADER]: value }, PROXY_IP),
					HEADER
				),
				PROXY_IP
			);
		}
	});

	void it("returns a stable placeholder when there is no address at all", () => {
		assert.equal(
			resolveClientIp(requestWith({}, undefined), HEADER),
			"unknown"
		);
	});
});
