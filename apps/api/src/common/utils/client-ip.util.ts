import { BlockList, isIP, isIPv4 } from "node:net";

import { type Request } from "express";

import { cloudflareIpRanges } from "../config/cloudflare-ip-ranges.config";

const UNKNOWN_IP = "unknown";
const REAL_IP_HEADER = "x-real-ip";
const CLOUDFLARE_CLIENT_IP_HEADER = "cf-connecting-ip";
const IPV4_MAPPED_PREFIX = "::ffff:";

function buildCloudflareBlockList() {
	const blockList = new BlockList();
	for (const type of ["ipv4", "ipv6"] as const) {
		for (const range of cloudflareIpRanges[type]) {
			const [network, prefix] = range.split("/") as [string, string];
			blockList.addSubnet(network, Number(prefix), type);
		}
	}
	return blockList;
}

const cloudflareBlockList = buildCloudflareBlockList();

function unmapIpv4(address: string) {
	const ipv4 = address.slice(IPV4_MAPPED_PREFIX.length);
	return address.toLowerCase().startsWith(IPV4_MAPPED_PREFIX) && isIPv4(ipv4)
		? ipv4
		: address;
}

function readHeaderIp(request: Request, headerName: string) {
	const value = request.headers[headerName];
	const candidate = (Array.isArray(value) ? value[0] : value)?.trim();
	return candidate && isIP(candidate) !== 0
		? unmapIpv4(candidate)
		: undefined;
}

function isCloudflareIp(address: string) {
	const version = isIP(address);
	return (
		version !== 0 &&
		cloudflareBlockList.check(address, version === 4 ? "ipv4" : "ipv6")
	);
}

function resolvePeerIp(request: Request) {
	return (
		readHeaderIp(request, REAL_IP_HEADER) ??
		(request.ip ? unmapIpv4(request.ip) : undefined)
	);
}

export function resolveClientIp(request: Request) {
	const peer = resolvePeerIp(request);
	if (!peer) {
		return UNKNOWN_IP;
	}
	if (!isCloudflareIp(peer)) {
		return peer;
	}
	return readHeaderIp(request, CLOUDFLARE_CLIENT_IP_HEADER) ?? peer;
}
