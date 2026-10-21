import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	backlogPublicSerializer,
	backlogSerializer
} from "../../src/backlog/backlog.serializer";
import { buildBacklog, buildGame } from "../unit-helpers/builders";

void describe("backlogSerializer", () => {
	void it("derives ratio and personalRatio from score, duration and real duration", () => {
		const result = backlogSerializer(buildBacklog());

		assert.equal(result.ratio, 4);
		assert.equal(result.personalRatio, 8);
	});

	void it("leaves personalRatio null when there is no real duration", () => {
		const result = backlogSerializer(buildBacklog({ realDuration: null }));

		assert.equal(result.personalRatio, null);
	});

	void it("exposes the private notes and latest progress to the owner", () => {
		const progress = {
			note: "boss down",
			createdAt: new Date("2024-01-02")
		};

		const result = backlogSerializer(buildBacklog(), null, [], progress);

		assert.equal(result.notes, "private notes");
		assert.deepEqual(result.latestProgress, progress);
	});

	void it("reports hasReview only when the review has non blank content", () => {
		assert.equal(
			backlogSerializer(buildBacklog(), { content: "Great", rating: 5 })
				.hasReview,
			true
		);
		assert.equal(
			backlogSerializer(buildBacklog(), { content: "   ", rating: 5 })
				.hasReview,
			false
		);
		assert.equal(
			backlogSerializer(buildBacklog(), { content: null, rating: 4 })
				.hasReview,
			false
		);
		assert.equal(backlogSerializer(buildBacklog()).hasReview, false);
	});

	void it("defaults optional collections and nulls", () => {
		const result = backlogSerializer(buildBacklog());

		assert.deepEqual(result.moodTags, []);
		assert.deepEqual(result.coopMembers, []);
		assert.equal(result.review, null);
		assert.equal(result.reviewContent, null);
		assert.equal(result.latestProgress, null);
		assert.equal(result.coopRunId, null);
		assert.equal(result.compilationGame, null);
	});

	void it("serializes the compilation game as a summary", () => {
		const compilation = buildGame({
			id: "comp-1",
			code: "collection",
			title: "Collection"
		});

		const result = backlogSerializer(
			buildBacklog({ CompilationGame: compilation })
		);

		assert.deepEqual(result.compilationGame, {
			id: "comp-1",
			code: "collection",
			title: "Collection",
			backgroundUrl: "https://img/bg.jpg"
		});
	});

	void it("only exposes the whitelisted game and platform fields", () => {
		const result = backlogSerializer(buildBacklog());

		assert.deepEqual(Object.keys(result.game).sort(), [
			"backgroundUrl",
			"code",
			"id",
			"isDlc",
			"title"
		]);
		assert.deepEqual(result.platform, {
			id: "platform-1",
			abbreviation: "PC"
		});
	});
});

void describe("backlogPublicSerializer", () => {
	void it("never exposes the notes nor the latest progress", () => {
		const progress = { note: "secret", createdAt: new Date() };

		const result = backlogPublicSerializer(
			buildBacklog(),
			null,
			[],
			progress
		);

		assert.equal("notes" in result, false);
		assert.equal("latestProgress" in result, false);
		assert.equal(JSON.stringify(result).includes("private notes"), false);
	});

	void it("keeps the rest of the public fields", () => {
		const result = backlogPublicSerializer(
			buildBacklog(),
			{ content: "ok", rating: 4 },
			["cozy"]
		);

		assert.equal(result.status, "completed");
		assert.equal(result.ratio, 4);
		assert.equal(result.hasReview, true);
		assert.deepEqual(result.moodTags, ["cozy"]);
	});
});
