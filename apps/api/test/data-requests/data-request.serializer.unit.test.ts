import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type DataRequest } from "../../src/data-requests/data-request.model";
import {
	adminDataRequestSerializer,
	dataRequestSerializer
} from "../../src/data-requests/serializers/data-request.serializer";
import { asModel } from "../unit-helpers/as-model";

const DAY_MS = 24 * 60 * 60 * 1000;
const REQUESTED_AT = new Date("2026-11-01T12:00:00.000Z");

function buildRequest(overrides: Partial<DataRequest> = {}) {
	return asModel<DataRequest>({
		id: "r-1",
		userId: "u-1",
		type: "export",
		status: "pending",
		resolutionNote: null,
		requestedAt: REQUESTED_AT,
		resolvedAt: null,
		resolvedById: null,
		...overrides
	});
}

void describe("dataRequestSerializer", () => {
	void it("sets the due date 30 days after the request", () => {
		const result = dataRequestSerializer(buildRequest(), REQUESTED_AT);

		assert.deepEqual(
			result.dueAt,
			new Date(REQUESTED_AT.getTime() + 30 * DAY_MS)
		);
		assert.equal(result.daysRemaining, 30);
	});

	void it("counts remaining days in whole calendar days", () => {
		const now = new Date(REQUESTED_AT.getTime() + 10.5 * DAY_MS);

		const result = dataRequestSerializer(buildRequest(), now);

		assert.equal(result.daysRemaining, 20);
	});

	void it("returns negative remaining days once the deadline passed", () => {
		const now = new Date(REQUESTED_AT.getTime() + 32 * DAY_MS);

		const result = dataRequestSerializer(buildRequest(), now);

		assert.equal(result.daysRemaining, -2);
	});

	void it("opens a 7 day download window for a completed export", () => {
		const resolvedAt = new Date("2026-11-03T08:00:00.000Z");

		const result = dataRequestSerializer(
			buildRequest({ status: "completed", resolvedAt })
		);

		assert.deepEqual(
			result.downloadableUntil,
			new Date(resolvedAt.getTime() + 7 * DAY_MS)
		);
	});

	void it("has no download window for deletions, rejections or pending exports", () => {
		const resolvedAt = new Date();
		const cases = [
			buildRequest(),
			buildRequest({ status: "rejected", resolvedAt }),
			buildRequest({ type: "deletion", status: "completed", resolvedAt })
		];

		for (const request of cases) {
			assert.equal(
				dataRequestSerializer(request).downloadableUntil,
				null
			);
		}
	});

	void it("exposes exactly the contract fields", () => {
		assert.deepEqual(
			Object.keys(dataRequestSerializer(buildRequest())).sort(),
			[
				"daysRemaining",
				"downloadableUntil",
				"dueAt",
				"id",
				"requestedAt",
				"resolutionNote",
				"resolvedAt",
				"status",
				"type"
			]
		);
	});
});

void describe("adminDataRequestSerializer", () => {
	void it("adds the owner summary", () => {
		const result = adminDataRequestSerializer(buildRequest(), {
			id: "u-1",
			username: "ana",
			email: "ana@completr.test"
		});

		assert.deepEqual(result.user, {
			id: "u-1",
			username: "ana",
			email: "ana@completr.test"
		});
	});

	void it("returns a null user when the account no longer exists", () => {
		const result = adminDataRequestSerializer(
			buildRequest({ userId: null }),
			null
		);

		assert.equal(result.user, null);
	});
});
