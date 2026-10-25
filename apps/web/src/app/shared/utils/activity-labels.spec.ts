import {
	activityIcon,
	activityIconColorClass,
	activityLabel
} from "./activity-labels";

describe("activity labels", () => {
	it("returns the label of a known activity", () => {
		expect(activityLabel("backlog_completed")).toBe("completed");
		expect(activityLabel("user_followed_by")).toBe("started following you");
	});

	it("returns the icon of a known activity", () => {
		expect(activityIcon("favorite_added")).toBe("favorite");
		expect(activityIcon("coop_tagged")).toBe("groups");
	});

	it("returns the color class of a known activity", () => {
		expect(activityIconColorClass("backlog_abandoned")).toBe("text-danger");
		expect(activityIconColorClass("game_reviewed")).toBe("text-success");
	});

	it("describes a platinum with the trophy icon", () => {
		expect(activityLabel("game_platinumed")).toBe("platinumed");
		expect(activityIcon("game_platinumed")).toBe("emoji_events");
		expect(activityIconColorClass("game_platinumed")).toBe(
			"text-fg-secondary"
		);
	});

	it("falls back for an unknown activity", () => {
		expect(activityLabel("nope")).toBe("did something");
		expect(activityIcon("nope")).toBe("circle");
		expect(activityIconColorClass("nope")).toBe("text-fg-muted");
	});
});
