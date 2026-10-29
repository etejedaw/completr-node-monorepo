import { type AuthSession } from "../../../core/services/auth.model";
import { currentSessionFirst, describeDevice, timeAgo } from "./session-device";

const CHROME_WINDOWS =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const EDGE_WINDOWS = `${CHROME_WINDOWS} Edg/120.0`;
const FIREFOX_LINUX =
	"Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
const SAFARI_MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const SAFARI_IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const SAFARI_IPAD =
	"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";

function session(id: string): AuthSession {
	return {
		id,
		deviceInfo: null,
		lastUsedAt: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		expiresAt: "2026-02-01T00:00:00.000Z"
	};
}

describe("describeDevice", () => {
	it("falls back to an unknown device without a user agent", () => {
		expect(describeDevice(null)).toEqual({
			name: "Unknown device",
			icon: "devices"
		});
	});

	it.each([
		[CHROME_WINDOWS, "Chrome · Windows", "desktop_windows"],
		[FIREFOX_LINUX, "Firefox · Linux", "computer"],
		[SAFARI_MAC, "Safari · macOS", "laptop_mac"],
		[SAFARI_IPHONE, "Safari · iPhone", "phone_iphone"],
		[SAFARI_IPAD, "Safari · iPad", "tablet_mac"],
		[CHROME_ANDROID, "Chrome · Android", "phone_android"]
	])("describes %s", (userAgent, name, icon) => {
		expect(describeDevice(userAgent)).toEqual({ name, icon });
	});

	it("recognises Edge before Chrome", () => {
		expect(describeDevice(EDGE_WINDOWS).name).toBe("Edge · Windows");
	});

	it("uses generic names for an unrecognised browser and system", () => {
		expect(describeDevice("curl/8.0")).toEqual({
			name: "Browser · Unknown OS",
			icon: "devices"
		});
	});
});

describe("timeAgo", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns never without a date", () => {
		expect(timeAgo(null)).toBe("never");
	});

	it("returns just now under a minute", () => {
		expect(timeAgo("2026-06-15T11:59:30.000Z")).toBe("just now");
	});

	it("returns minutes under an hour", () => {
		expect(timeAgo("2026-06-15T11:15:00.000Z")).toBe("45m ago");
	});

	it("returns hours under a day", () => {
		expect(timeAgo("2026-06-15T07:00:00.000Z")).toBe("5h ago");
	});

	it("returns days from 24 hours on", () => {
		expect(timeAgo("2026-06-12T12:00:00.000Z")).toBe("3d ago");
	});
});

describe("currentSessionFirst", () => {
	it("moves the current session to the top keeping the others in order", () => {
		const sessions = [session("a"), session("b"), session("c")];

		const sorted = currentSessionFirst(sessions, "c");

		expect(sorted.map(item => item.id)).toEqual(["c", "a", "b"]);
	});

	it("keeps the order when there is no current session", () => {
		const sessions = [session("a"), session("b")];

		expect(currentSessionFirst(sessions, null).map(s => s.id)).toEqual([
			"a",
			"b"
		]);
	});

	it("does not mutate the input", () => {
		const sessions = [session("a"), session("b")];

		currentSessionFirst(sessions, "b");

		expect(sessions.map(item => item.id)).toEqual(["a", "b"]);
	});
});
