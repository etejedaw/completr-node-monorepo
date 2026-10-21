import { failedPasswordRules, PASSWORD_RULES } from "./password-policy";
import { planLimitMessage } from "./plan-limit-message";
import { avatarRing, isPremiumRole } from "./premium";
import { elevatedRoleBadge } from "./role-badge";

describe("isPremiumRole", () => {
	it.each(["premium", "moderator", "admin"])("grants premium to %s", role => {
		expect(isPremiumRole(role)).toBe(true);
	});

	it.each(["user", "", "superuser", null, undefined])(
		"denies premium to %s",
		role => {
			expect(isPremiumRole(role)).toBe(false);
		}
	);
});

describe("avatarRing", () => {
	it("gives admins the admin ring", () => {
		expect(avatarRing("admin")).toBe("admin");
	});

	it("gives premium and moderator the premium ring", () => {
		expect(avatarRing("premium")).toBe("premium");
		expect(avatarRing("moderator")).toBe("premium");
	});

	it("gives no ring to regular or missing roles", () => {
		expect(avatarRing("user")).toBeNull();
		expect(avatarRing(null)).toBeNull();
		expect(avatarRing(undefined)).toBeNull();
	});
});

describe("elevatedRoleBadge", () => {
	it("labels the three elevated roles", () => {
		expect(elevatedRoleBadge("admin")?.label).toBe("Admin");
		expect(elevatedRoleBadge("moderator")?.label).toBe("Mod");
		expect(elevatedRoleBadge("premium")?.label).toBe("Premium");
	});

	it("only gives the admin badge an icon", () => {
		expect(elevatedRoleBadge("admin")?.icon).toBe("shield");
		expect(elevatedRoleBadge("premium")?.icon).toBeNull();
	});

	it.each(["user", "", null, undefined, "toString", "constructor"])(
		"returns no badge for %s",
		role => {
			expect(elevatedRoleBadge(role)).toBeNull();
		}
	);
});

describe("planLimitMessage", () => {
	it("returns the message of a known limit type", () => {
		expect(planLimitMessage("QUEUE_LIMIT_REACHED")).toContain("Up Next");
		expect(planLimitMessage("WISHLIST_LIMIT_REACHED")).toContain(
			"Want to Get"
		);
	});

	it("shares the frozen message between list and list item", () => {
		expect(planLimitMessage("LIST_FROZEN")).toBe(
			planLimitMessage("LIST_ITEM_FROZEN")
		);
	});

	it.each(["UNKNOWN", "", 42, null, undefined, {}])(
		"returns null for %s",
		type => {
			expect(planLimitMessage(type)).toBeNull();
		}
	);
});

describe("password policy", () => {
	it("accepts a password that meets every rule", () => {
		expect(failedPasswordRules("Abcdef1!")).toEqual([]);
	});

	it("reports every rule a weak password breaks", () => {
		expect(failedPasswordRules("abc").map(r => r.id)).toEqual([
			"length",
			"uppercase",
			"number",
			"symbol"
		]);
	});

	it.each([
		["Abcde1!", "length"],
		["Abcdefghijklmn1!", "length"],
		["ABCDEF1!", "lowercase"],
		["abcdef1!", "uppercase"],
		["Abcdefg!", "number"],
		["Abcdefg1", "symbol"]
	])("flags %s for the %s rule", (password, ruleId) => {
		expect(failedPasswordRules(password).map(r => r.id)).toEqual([ruleId]);
	});

	it("enforces the length bounds inclusively", () => {
		const length = PASSWORD_RULES.find(r => r.id === "length")!;

		expect(length.test("a".repeat(8))).toBe(true);
		expect(length.test("a".repeat(15))).toBe(true);
		expect(length.test("a".repeat(7))).toBe(false);
		expect(length.test("a".repeat(16))).toBe(false);
	});
});
