import { elevatedRoleBadge } from "./role-badge";

describe("elevatedRoleBadge", () => {
	it("returns the admin badge with the shield icon", () => {
		expect(elevatedRoleBadge("admin")).toEqual({
			label: "Admin",
			className: "bg-admin-metal text-admin",
			icon: "shield"
		});
	});

	it("returns the moderator badge without icon", () => {
		const badge = elevatedRoleBadge("moderator");

		expect(badge?.label).toBe("Mod");
		expect(badge?.icon).toBeNull();
	});

	it("returns the premium badge", () => {
		expect(elevatedRoleBadge("premium")?.label).toBe("Premium");
	});

	it.each(["user", "toString", "", null, undefined])(
		"returns null for %s",
		role => {
			expect(elevatedRoleBadge(role)).toBeNull();
		}
	);
});
