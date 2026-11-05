import { type DataRequest } from "../../core/models";
import {
	dataRequestStatusBadge,
	dataRequestTypeDisplay,
	daysRemainingBadge,
	isDownloadable,
	isDownloadExpired
} from "./data-request-display";

const NOW = new Date("2026-11-05T12:00:00.000Z");

function request(overrides: Partial<DataRequest> = {}): DataRequest {
	return {
		id: "r1",
		type: "export",
		status: "completed",
		requestedAt: "2026-11-01T12:00:00.000Z",
		resolvedAt: "2026-11-03T12:00:00.000Z",
		dueAt: "2026-12-01T12:00:00.000Z",
		daysRemaining: 26,
		downloadableUntil: "2026-11-10T12:00:00.000Z",
		resolutionNote: null,
		...overrides
	};
}

describe("data request display", () => {
	it("names each request type with an icon", () => {
		expect(dataRequestTypeDisplay("export").label).toBe("Copy of data");
		expect(dataRequestTypeDisplay("deletion").label).toBe(
			"Account deletion"
		);
	});

	it.each([
		["pending", "Pending", "info"],
		["completed", "Completed", "success"],
		["rejected", "Rejected", "danger"]
	] as const)("paints the %s status", (status, label, tone) => {
		expect(dataRequestStatusBadge(status)).toMatchObject({ label, tone });
	});

	it.each([
		[26, "26 days left", "neutral"],
		[8, "8 days left", "neutral"],
		[7, "7 days left", "warning"],
		[1, "1 day left", "warning"],
		[0, "Due today", "danger"],
		[-1, "Overdue by 1 day", "danger"],
		[-4, "Overdue by 4 days", "danger"]
	] as const)(
		"highlights %i days remaining",
		(daysRemaining, label, tone) => {
			expect(daysRemainingBadge(daysRemaining)).toMatchObject({
				label,
				tone
			});
		}
	);

	it("allows downloading a completed export until it expires", () => {
		expect(isDownloadable(request(), NOW)).toBe(true);
		expect(isDownloadExpired(request(), NOW)).toBe(false);
	});

	it("marks a completed export past its window as expired", () => {
		const expired = request({
			downloadableUntil: "2026-11-05T11:59:59.000Z"
		});
		expect(isDownloadable(expired, NOW)).toBe(false);
		expect(isDownloadExpired(expired, NOW)).toBe(true);
	});

	it.each([
		request({ status: "pending", downloadableUntil: null }),
		request({ status: "rejected", downloadableUntil: null }),
		request({ type: "deletion", downloadableUntil: null })
	])("never offers a download or an expiry for %o", item => {
		expect(isDownloadable(item, NOW)).toBe(false);
		expect(isDownloadExpired(item, NOW)).toBe(false);
	});
});
