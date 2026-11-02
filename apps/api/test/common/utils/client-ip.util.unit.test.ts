import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Request } from "express";

import { resolveClientIp } from "../../../src/common/utils/client-ip.util";
import { asModel } from "../../unit-helpers/as-model";

const SOCKET_IP = "172.18.0.4";
const DIRECT_CLIENT_IP = "198.51.100.7";
const CLOUDFLARE_EDGE_IPV4 = "172.70.10.20";
const CLOUDFLARE_EDGE_IPV6 = "2606:4700:10::1";
const VISITOR_IP = "203.0.113.9";

const GARBAGE_VALUES = [
	"",
	"   ",
	"not-an-ip",
	"<script>alert(1)</script>",
	"999.999.999.999",
	"203.0.113.9, 198.51.100.1",
	"😀",
	"1".repeat(5000)
];

function requestWith(headers: Record<string, string | string[]>, ip?: string) {
	return asModel<Request>({ headers, ip });
}

void describe("resolveClientIp", () => {
	void it("uses the socket address when no proxy headers arrive", () => {
		assert.equal(resolveClientIp(requestWith({}, SOCKET_IP)), SOCKET_IP);
	});

	void it("unmaps IPv4-mapped IPv6 socket addresses", () => {
		assert.equal(
			resolveClientIp(requestWith({}, `::ffff:${SOCKET_IP}`)),
			SOCKET_IP
		);
	});

	void it("prefers x-real-ip over the socket address", () => {
		assert.equal(
			resolveClientIp(
				requestWith({ "x-real-ip": DIRECT_CLIENT_IP }, SOCKET_IP)
			),
			DIRECT_CLIENT_IP
		);
	});

	void it("ignores a spoofed cf-connecting-ip when the peer is not Cloudflare", () => {
		assert.equal(
			resolveClientIp(
				requestWith(
					{
						"x-real-ip": DIRECT_CLIENT_IP,
						"cf-connecting-ip": VISITOR_IP
					},
					SOCKET_IP
				)
			),
			DIRECT_CLIENT_IP
		);
		assert.equal(
			resolveClientIp(
				requestWith({ "cf-connecting-ip": VISITOR_IP }, SOCKET_IP)
			),
			SOCKET_IP
		);
	});

	void it("uses cf-connecting-ip when the peer is a Cloudflare edge", () => {
		for (const edge of [
			CLOUDFLARE_EDGE_IPV4,
			CLOUDFLARE_EDGE_IPV6,
			`::ffff:${CLOUDFLARE_EDGE_IPV4}`
		]) {
			assert.equal(
				resolveClientIp(
					requestWith(
						{ "x-real-ip": edge, "cf-connecting-ip": VISITOR_IP },
						SOCKET_IP
					)
				),
				VISITOR_IP
			);
		}
		assert.equal(
			resolveClientIp(
				requestWith(
					{ "cf-connecting-ip": "2001:db8::1" },
					CLOUDFLARE_EDGE_IPV4
				)
			),
			"2001:db8::1"
		);
	});

	void it("trims header values and takes the first of repeated headers", () => {
		assert.equal(
			resolveClientIp(
				requestWith(
					{
						"x-real-ip": [
							` ${CLOUDFLARE_EDGE_IPV4} `,
							DIRECT_CLIENT_IP
						],
						"cf-connecting-ip": [`  ${VISITOR_IP} `, "198.51.100.1"]
					},
					SOCKET_IP
				)
			),
			VISITOR_IP
		);
	});

	void it("keeps the Cloudflare edge as key when cf-connecting-ip is missing or garbage", () => {
		assert.equal(
			resolveClientIp(
				requestWith({ "x-real-ip": CLOUDFLARE_EDGE_IPV4 }, SOCKET_IP)
			),
			CLOUDFLARE_EDGE_IPV4
		);
		for (const value of GARBAGE_VALUES) {
			assert.equal(
				resolveClientIp(
					requestWith(
						{
							"x-real-ip": CLOUDFLARE_EDGE_IPV4,
							"cf-connecting-ip": value
						},
						SOCKET_IP
					)
				),
				CLOUDFLARE_EDGE_IPV4
			);
		}
	});

	void it("falls back to the socket address when x-real-ip is garbage", () => {
		for (const value of GARBAGE_VALUES) {
			assert.equal(
				resolveClientIp(
					requestWith(
						{ "x-real-ip": value, "cf-connecting-ip": VISITOR_IP },
						SOCKET_IP
					)
				),
				SOCKET_IP
			);
		}
	});

	void it("does not treat addresses next to the Cloudflare ranges as Cloudflare", () => {
		for (const outsider of [
			"172.63.255.255",
			"172.72.0.0",
			"2606:4701::1"
		]) {
			assert.equal(
				resolveClientIp(
					requestWith(
						{
							"x-real-ip": outsider,
							"cf-connecting-ip": VISITOR_IP
						},
						SOCKET_IP
					)
				),
				outsider
			);
		}
	});

	void it("returns a stable placeholder when there is no address at all", () => {
		assert.equal(resolveClientIp(requestWith({}, undefined)), "unknown");
	});
});
