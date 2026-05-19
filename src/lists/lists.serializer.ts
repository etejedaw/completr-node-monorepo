import { listItemSerializer } from "../list-items/list-items.serializer";
import { List } from "./list.model";

interface ListSerializerOptions {
	followerCount?: number;
	isFollowing?: boolean;
	backlogStatusMap?: Map<string, string>;
	progress?: { completed: number; total: number } | null;
}

export function listSerializer(
	list: List,
	options: ListSerializerOptions = {}
) {
	const { followerCount, isFollowing, backlogStatusMap, progress } = options;

	return {
		id: list.id,
		userId: list.userId,
		name: list.name,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		followerCount: followerCount ?? 0,
		isFollowing: isFollowing ?? false,
		progress: progress ?? null,
		items: list.ListItems?.map(item => ({
			...listItemSerializer(item),
			backlogStatus: backlogStatusMap?.get(item.gameId) ?? null
		}))
	};
}

export function listSummarySerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		previewItems:
			list.ListItems?.map(item => ({
				id: item.id,
				game: item.Game
					? {
							id: item.Game.id,
							code: item.Game.code,
							title: item.Game.title,
							backgroundUrl: item.Game.backgroundUrl
						}
					: null
			})) ?? []
	};
}
