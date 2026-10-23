import { planLimitMessage } from "./plan-limit-message";

describe("planLimitMessage", () => {
	it("returns the message of a known limit type", () => {
		expect(planLimitMessage("QUEUE_LIMIT_REACHED")).toBe(
			"You've reached the free limit for Up Next. Remove a game to queue another."
		);
	});

	it("shares the frozen message between list and list item", () => {
		expect(planLimitMessage("LIST_FROZEN")).toBe(
			planLimitMessage("LIST_ITEM_FROZEN")
		);
	});

	it("returns null for an unknown type", () => {
		expect(planLimitMessage("SOMETHING_ELSE")).toBeNull();
	});

	it.each([undefined, null, 42, {}])("returns null for %s", value => {
		expect(planLimitMessage(value)).toBeNull();
	});
});
