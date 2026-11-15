import { type Transaction } from "sequelize";

import { CompilationItem } from "./compilation-item.model";

export async function removeByParentGameId(
	parentGameId: string,
	transaction: Transaction
) {
	await CompilationItem.destroy({ where: { parentGameId }, transaction });
}

export async function createMany(
	rows: { parentGameId: string; childGameId: string; position: number }[],
	transaction: Transaction
) {
	return CompilationItem.bulkCreate(rows, { validate: true, transaction });
}

export async function findByParentGameId(parentGameId: string) {
	return CompilationItem.findAll({
		where: { parentGameId },
		include: [
			{
				association: "ChildGame",
				include: [
					{ association: "Platforms" },
					{ association: "GameScores" },
					{ association: "GameTimes" },
					{ association: "Genres" }
				]
			}
		],
		order: [
			["position", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function findByChildGameId(childGameId: string) {
	return CompilationItem.findAll({
		where: { childGameId },
		include: [
			{
				association: "ParentGame",
				where: { isActive: true },
				required: true
			}
		],
		order: [
			["createdAt", "ASC"],
			["id", "ASC"]
		]
	});
}

export async function existsPair(
	parentGameId: string,
	childGameId: string
): Promise<boolean> {
	return (
		(await CompilationItem.count({
			where: { parentGameId, childGameId }
		})) > 0
	);
}
