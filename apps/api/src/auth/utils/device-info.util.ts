import { type Request } from "express";

const DEVICE_INFO_MAX_LENGTH = 500;

export function getDeviceInfo(request: Request): string {
	return (request.headers["user-agent"] ?? "Unknown device").slice(
		0,
		DEVICE_INFO_MAX_LENGTH
	);
}
