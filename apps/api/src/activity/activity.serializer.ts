import { type User } from "../users/user.model";
import { type Activity } from "./activity.model";

export function activitySerializer(
	activity: Activity,
	premiumUserIds?: ReadonlySet<string>
) {
	const target = resolveTarget(activity, premiumUserIds);

	return {
		id: activity.id,
		type: activity.type,
		createdAt: activity.createdAt,
		user: userSerializer(activity.User, premiumUserIds),
		target,
		game: resolveMetadataGame(activity)
	};
}

function resolveMetadataGame(activity: Activity) {
	const game = activity.metadata?.game as
		| {
				id: string;
				title: string;
				code: string;
				backgroundUrl: string | null;
		  }
		| undefined;

	if (!game) return undefined;

	return {
		type: "game",
		id: game.id,
		name: game.title,
		code: game.code,
		backgroundUrl: game.backgroundUrl
	};
}

function resolveTarget(
	activity: Activity,
	premiumUserIds?: ReadonlySet<string>
) {
	if (activity.ActivityGame?.Game) {
		const game = activity.ActivityGame.Game;
		return {
			type: "game",
			id: game.id,
			name: game.title,
			code: game.code,
			backgroundUrl: game.backgroundUrl
		};
	}

	if (activity.ActivityList?.List) {
		const list = activity.ActivityList.List;
		return {
			type: "list",
			id: list.id,
			name: list.name
		};
	}

	if (activity.ActivityUser?.TargetUser) {
		const targetUser = activity.ActivityUser.TargetUser;
		return {
			type: "user",
			id: targetUser.id,
			name: targetUser.name || targetUser.username,
			username: targetUser.username,
			avatarUrl: targetUser.avatarUrl,
			role: targetUser.role,
			hasPremium: premiumUserIds?.has(targetUser.id) ?? false
		};
	}

	return null;
}

function userSerializer(user?: User, premiumUserIds?: ReadonlySet<string>) {
	if (!user) return null;
	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatarUrl: user.avatarUrl,
		role: user.role,
		hasPremium: premiumUserIds?.has(user.id) ?? false
	};
}
