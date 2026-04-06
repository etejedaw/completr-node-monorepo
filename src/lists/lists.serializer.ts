import { listItemSerializer } from "../list-items/list-items.serializer";
import { List } from "./list.model";

export function listSerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		basedOnId: list.basedOnId,
		isFork: list.isFork,
		items: list.ListItems?.map(listItemSerializer)
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
		basedOnId: list.basedOnId,
		isFork: list.isFork
	};
}
