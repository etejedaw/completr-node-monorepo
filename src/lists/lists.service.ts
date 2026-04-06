import { List } from "./list.model";
import { ListItem } from "../list-items/list-item.model";
import { Game } from "../games/game.model";
import { RequestUser } from "../common/interfaces/request-user.interface";
import { RegisterListDto } from "./dtos/register-list.dto";
import { UpdateListDto } from "./dtos/update-list.dto";
import * as listsServiceError from "./errors/lists.service-error";

const FREE_LIST_LIMIT = 5;

function isPremium(role: string) {
	return role === "premium" || role === "admin";
}

async function areFrozen(userId: string, role: string) {
	if (isPremium(role)) return false;
	const count = await List.count({ where: { userId } });
	return count > FREE_LIST_LIMIT;
}

export async function createList(
	user: RequestUser,
	registerList: RegisterListDto
) {
	if (!isPremium(user.role)) {
		const count = await List.count({ where: { userId: user.id } });
		if (count >= FREE_LIST_LIMIT)
			throw listsServiceError.limitReachedError();
	}

	return List.create({
		...registerList,
		userId: user.id
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

export async function findListsByUserId(user: RequestUser) {
	const lists = await List.findAll({
		where: { userId: user.id },
		order: [["createdAt", "DESC"]]
	});

	const frozen = await areFrozen(user.id, user.role);

	return { lists, frozen };
}

export async function updateList(
	id: string,
	user: RequestUser,
	updateList: UpdateListDto
) {
	const list = await findListById(id);
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== user.id) throw listsServiceError.forbiddenError();

	const frozen = await areFrozen(user.id, user.role);
	if (frozen) throw listsServiceError.frozenError();

	return list.update(updateList);
}

export async function removeList(id: string, user: RequestUser) {
	const list = await List.findOne({ where: { id } });
	if (!list) throw listsServiceError.notFoundError();
	if (list.userId !== user.id) throw listsServiceError.forbiddenError();

	await List.destroy({ where: { id } });
	return true;
}
