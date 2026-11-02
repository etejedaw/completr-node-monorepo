import { isIP } from "node:net";

import { type Request } from "express";

import { environmentConfig } from "../config/environment.config";

const UNKNOWN_IP = "unknown";

function readHeaderIp(request: Request, headerName: string) {
	const value = request.headers[headerName];
	const candidate = (Array.isArray(value) ? value[0] : value)?.trim();
	return candidate && isIP(candidate) !== 0 ? candidate : undefined;
}

export function resolveClientIp(
	request: Request,
	headerName = environmentConfig.CLIENT_IP_HEADER
) {
	const headerIp = headerName ? readHeaderIp(request, headerName) : undefined;
	return headerIp ?? request.ip ?? UNKNOWN_IP;
}
