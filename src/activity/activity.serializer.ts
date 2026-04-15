import { Game } from "../games/game.model";
import { User } from "../users/user.model";
import { Activity } from "./activity.model";

export function activitySerializer(activity: Activity) {
	return {
		id: activity.id,
		type: activity.type,
		metadata: activity.metadata,
		createdAt: activity.createdAt,
		user: userSerializer(activity.User),
		game: gameSerializer(activity.Game)
	};
}

function userSerializer(user?: User) {
	if (!user) return null;
	return {
		id: user.id,
		username: user.username,
		name: user.name,
		avatarUrl: user.avatarUrl
	};
}

function gameSerializer(game?: Game | null) {
	if (!game) return null;
	return {
		id: game.id,
		title: game.title,
		code: game.code,
		backgroundUrl: game.backgroundUrl
	};
}
