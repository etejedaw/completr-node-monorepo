import { avatarRing, isPremiumRole } from "./premium";

describe("isPremiumRole", () => {
	it.each(["premium", "moderator", "admin"])("treats %s as premium", role => {
		expect(isPremiumRole(role)).toBe(true);
	});

	it.each(["user", "unknown", "", null, undefined])(
		"does not treat %s as premium",
		role => {
			expect(isPremiumRole(role)).toBe(false);
		}
	);
});

describe("avatarRing", () => {
	it("returns the admin ring for admins", () => {
		expect(avatarRing("admin")).toBe("admin");
	});

	it.each(["premium", "moderator"])(
		"returns the premium ring for %s",
		role => {
			expect(avatarRing(role)).toBe("premium");
		}
	);

	it.each(["user", null, undefined])("returns no ring for %s", role => {
		expect(avatarRing(role)).toBeNull();
	});
});
