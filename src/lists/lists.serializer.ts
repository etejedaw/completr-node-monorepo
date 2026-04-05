import { ListItem } from "../list-items/list-item.model";
import { listItemSerializer } from "../list-items/list-items.serializer";
import { List } from "./list.model";

export function listSerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		slug: list.slug,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		basedOnId: list.basedOnId,
		isFork: list.isFork,
		items: (list as List & { ListItems?: ListItem[] }).ListItems?.map(
			listItemSerializer
		)
	};
}

export function listSummarySerializer(list: List) {
	return {
		id: list.id,
		name: list.name,
		slug: list.slug,
		description: list.description,
		isPublic: list.isPublic,
		scoreSource: list.scoreSource,
		durationSource: list.durationSource,
		basedOnId: list.basedOnId,
		isFork: list.isFork
	};
}
