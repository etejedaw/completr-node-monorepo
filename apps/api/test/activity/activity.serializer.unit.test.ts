import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Activity } from "../../src/activity/activity.model";
import { activitySerializer } from "../../src/activity/activity.serializer";
import { asModel } from "../unit-helpers/as-model";

function buildActivity(overrides: Record<string, unknown> = {}) {
	return asModel<Activity>({
		id: "a-1",
		type: "backlog_completed",
		createdAt: new Date("2024-01-01"),
		metadata: null,
		User: {
			id: "u-1",
			username: "player",
			name: "Player",
			avatarUrl: null,
			role: "user",
			email: "x@y.z"
		},
		...overrides
	});
}

void describe("activitySerializer", () => {
	void it("resolves a game target", () => {
		const result = activitySerializer(
			buildActivity({
				ActivityGame: {
					Game: {
						id: "g-1",
						title: "Celeste",
						code: "celeste",
						backgroundUrl: "bg"
					}
				}
			})
		);

		assert.deepEqual(result.target, {
			type: "game",
			id: "g-1",
			name: "Celeste",
			code: "celeste",
			backgroundUrl: "bg"
		});
	});

	void it("resolves a list target", () => {
		const result = activitySerializer(
			buildActivity({
				ActivityList: { List: { id: "l-1", name: "Favs" } }
			})
		);

		assert.deepEqual(result.target, {
			type: "list",
			id: "l-1",
			name: "Favs"
		});
	});

	void it("resolves a user target using the username when the name is empty", () => {
		const result = activitySerializer(
			buildActivity({
				ActivityUser: {
					TargetUser: {
						id: "u-2",
						name: "",
						username: "friend",
						avatarUrl: null,
						role: "user"
					}
				}
			})
		);

		assert.equal(result.target?.type, "user");
		assert.equal(result.target?.name, "friend");
	});

	void it("prefers the game target over list and user targets", () => {
		const result = activitySerializer(
			buildActivity({
				ActivityGame: {
					Game: {
						id: "g-1",
						title: "Celeste",
						code: "c",
						backgroundUrl: null
					}
				},
				ActivityList: { List: { id: "l-1", name: "Favs" } }
			})
		);

		assert.equal(result.target?.type, "game");
	});

	void it("returns a null target when no relation was loaded", () => {
		assert.equal(activitySerializer(buildActivity()).target, null);
	});

	void it("reads the metadata game and leaves it undefined otherwise", () => {
		const withMetadata = activitySerializer(
			buildActivity({
				metadata: {
					game: {
						id: "g-1",
						title: "Celeste",
						code: "celeste",
						backgroundUrl: null
					}
				}
			})
		);

		assert.deepEqual(withMetadata.game, {
			type: "game",
			id: "g-1",
			name: "Celeste",
			code: "celeste",
			backgroundUrl: null
		});
		assert.equal(activitySerializer(buildActivity()).game, undefined);
	});

	void it("serializes the author without private fields and tolerates a missing author", () => {
		const result = activitySerializer(buildActivity());

		assert.equal("email" in (result.user ?? {}), false);
		assert.equal(
			activitySerializer(buildActivity({ User: undefined })).user,
			null
		);
	});
});
