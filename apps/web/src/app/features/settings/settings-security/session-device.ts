import { type AuthSession } from "../../../core/services/auth.model";
import { type SessionDevice } from "./session-device.model";

const OPERATING_SYSTEMS: { pattern: RegExp; name: string; icon: string }[] = [
	{ pattern: /iPad/i, name: "iPad", icon: "tablet_mac" },
	{ pattern: /iPhone|iPod/i, name: "iPhone", icon: "phone_iphone" },
	{ pattern: /Android/i, name: "Android", icon: "phone_android" },
	{ pattern: /Windows/i, name: "Windows", icon: "desktop_windows" },
	{ pattern: /Macintosh|Mac OS X/i, name: "macOS", icon: "laptop_mac" },
	{ pattern: /Linux/i, name: "Linux", icon: "computer" }
];

const BROWSERS: { pattern: RegExp; name: string }[] = [
	{ pattern: /Edg\//i, name: "Edge" },
	{ pattern: /Firefox\//i, name: "Firefox" },
	{ pattern: /Chrome\//i, name: "Chrome" },
	{ pattern: /Safari\//i, name: "Safari" }
];

export function describeDevice(userAgent: string | null): SessionDevice {
	if (!userAgent) return { name: "Unknown device", icon: "devices" };
	const os = OPERATING_SYSTEMS.find(entry => entry.pattern.test(userAgent));
	const browser = BROWSERS.find(entry => entry.pattern.test(userAgent));
	return {
		name: `${browser?.name ?? "Browser"} · ${os?.name ?? "Unknown OS"}`,
		icon: os?.icon ?? "devices"
	};
}

export function timeAgo(date: string | null): string {
	if (!date) return "never";
	const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

export function currentSessionFirst(
	sessions: AuthSession[],
	currentId: string | null
): AuthSession[] {
	return [...sessions].sort(
		(a, b) => Number(b.id === currentId) - Number(a.id === currentId)
	);
}
