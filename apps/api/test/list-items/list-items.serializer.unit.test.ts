/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ListItem } from "../../src/list-items/list-item.model";
import { listItemSerializer } from "../../src/list-items/list-items.serializer";
import { asModel } from "../unit-helpers/as-model";
import { buildGame } from "../unit-helpers/builders";

function buildItem(overrides: Record<string, unknown> = {}) {
	return asModel<ListItem>({
		id: "li-1",
		position: 1,
		score: 4.5,
		duration: 15,
		Game: buildGame(),
		...overrides
	});
}

describe("listItemSerializer", () => {
	it("computes the ratio from the frozen score and duration", () => {
		assert.equal(listItemSerializer(buildItem()).ratio, 6);
	});

	it("leaves the ratio undefined when the source has no score or duration", () => {
		assert.equal(
			listItemSerializer(buildItem({ score: null })).ratio,
			undefined
		);
		assert.equal(
			listItemSerializer(buildItem({ duration: null })).ratio,
			undefined
		);
	});

	it("returns an undefined game when it was not loaded", () => {
		assert.equal(
			listItemSerializer(buildItem({ Game: undefined })).game,
			undefined
		);
	});
});
