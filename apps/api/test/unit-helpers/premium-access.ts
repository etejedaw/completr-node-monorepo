import { isPremiumRole } from "../../src/common/utils/is-premium-role.util";
import { type PremiumAccess } from "../../src/premium-access/premium-access.interface";
import * as premiumAccessService from "../../src/premium-access/premium-access.service";
import { stub } from "./mocks";

export function stubPremiumAccess(overrides: Partial<PremiumAccess> = {}) {
	return stub(
		premiumAccessService,
		"resolvePremiumAccess",
		async (user: { role: string }) => ({
			allowed: isPremiumRole(user.role),
			source: isPremiumRole(user.role) ? "role" : null,
			expiresAt: null,
			...overrides
		})
	);
}
