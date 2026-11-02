import {
	resolvePremiumFeatures,
	resolvePremiumStatus
} from "../premium-access/premium-access.service";
import { type User } from "./user.model";
import { userMeSerializer } from "./users.serializer";

export async function buildUserMe(user: User) {
	const [premiumAccess, premiumFeatures] = await Promise.all([
		resolvePremiumStatus(user),
		resolvePremiumFeatures(user)
	]);
	return userMeSerializer(user, premiumAccess, premiumFeatures);
}
