import { type UserFollowRequest } from "./user-follow-request.model";

export function incomingFollowRequestSerializer(
	row: UserFollowRequest,
	premiumUserIds: ReadonlySet<string>
) {
	return {
		requesterId: row.requesterId,
		createdAt: row.createdAt,
		user: row.Requester
			? {
					...row.Requester.get({ plain: true }),
					hasPremium: premiumUserIds.has(row.requesterId)
				}
			: null
	};
}
