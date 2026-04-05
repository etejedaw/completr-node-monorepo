import { List } from "./list.model";
import { ListItem } from "../list-items/list-item.model";
import { Game } from "../games/game.model";
import { RegisterListDto } from "./dtos/register-list.dto";
import { UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";
import { titleToSlug } from "../common/utils/title-to-slug.util";

export async function createList(
	userId: string,
	registerList: RegisterListDto
) {
	const slug = titleToSlug(registerList.name);

	return List.create({
		...registerList,
		userId,
		slug
	});
}

export async function findListById(id: string) {
	return List.findOne({
		where: { id },
		include: [
			{
				model: ListItem,
				include: [{ model: Game }],
				separate: true,
				order: [["position", "ASC"]]
			}
		]
	});
}

export async function findListsByUserId(userId: string) {
	return List.findAll({
		where: { userId },
		order: [["createdAt", "DESC"]]
	});
}

export async function updateList(
	id: string,
	userId: string,
	updateList: UpdateListDto
) {
	const list = await List.findOne({ where: { id } });
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== userId) throw listsServiceError.forbiddenError();

	const updates: Record<string, unknown> = { ...updateList };
	if (updateList.name) {
		updates.slug = titleToSlug(updateList.name);
	}

	await list.update(updates);
	return findListById(id);
}

export async function removeList(id: string, userId: string) {
	const list = await List.findOne({ where: { id } });
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== userId) throw listsServiceError.forbiddenError();

	await List.destroy({ where: { id } });
	return true;
}
