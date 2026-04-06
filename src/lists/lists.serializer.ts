import { listItemSerializer } from "../list-items/list-items.serializer";
import { List } from "./list.model";

interface ListSerializerOptions {
	followerCount?: number;
	isFollowing?: boolean;
	backlogStatusMap?: Map<string, string>;
}

export function listSerializer(
	list: List,
	options: ListSerializerOptions = {}
) {
	const { followerCount, isFollowing, backlogStatusMap } = options;

	return {
		id: list.id,
		name: list.name,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		followerCount: followerCount ?? 0,
		isFollowing: isFollowing ?? false,
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
		durationSource: list.durationSource
	};
}
