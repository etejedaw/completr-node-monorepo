import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../../common/utils/title-to-slug.util";
import * as compilationItemsService from "../../compilation-items/compilation-items.service";
import { sequelize } from "../../database/sequelize.database";
import * as gamesServiceError from "../errors/games.service-error";
import { Game } from "../game.model";
import { type CatalogAssets } from "../games.interface";
import { type SetCompilationItemInput } from "../games.types";
import { buildCatalogIncludes } from "../utils/build-catalog-includes.util";
import { extractCatalogAssets } from "../utils/extract-catalog-assets.util";
import { cloneCatalogAssetsToGames } from "./games-clone-assets.service";

export async function setCompilationItems(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	const parent = await loadCompilationParent(parentGameId);
	assertCompilationItemsValid(parentGameId, items);
	await assertLinkedGamesExist(linkedGameIds(items));

	const inherited = extractCatalogAssets(parent);

	try {
		await sequelize.transaction(async transaction => {
			await compilationItemsService.removeByParentGameId(
				parentGameId,
				transaction
			);

			const children = await createCompilationChildren(
				parent,
				createdTitles(items),
				inherited,
				transaction
			);
			const createdChildIds = children.map(child => child.id);
			const resolvedChildIds = items.flatMap(item =>
				item.mode === "link"
					? [item.gameId]
					: createdChildIds.splice(0, 1)
			);

			if (new Set(resolvedChildIds).size !== resolvedChildIds.length)
				throw gamesServiceError.compilationInvalidError();

			await compilationItemsService.createMany(
				resolvedChildIds.map((childGameId, position) => ({
					parentGameId,
					childGameId,
					position
				})),
				transaction
			);

			await parent.update({ isCompilation: true }, { transaction });
		});
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}

	return findCompilationItemsByParent(parentGameId);
}

export async function clearCompilation(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true }
	});
	if (!parent) throw gamesServiceError.notFoundError();

	await sequelize.transaction(async transaction => {
		await compilationItemsService.removeByParentGameId(
			parentGameId,
			transaction
		);
		await parent.update({ isCompilation: false }, { transaction });
	});
}

export async function findCompilationItemsByParent(parentGameId: string) {
	return compilationItemsService.findByParentGameId(parentGameId);
}

export async function existsActiveCompilation(id: string): Promise<boolean> {
	const count = await Game.count({
		where: { id, isActive: true, isCompilation: true }
	});
	return count > 0;
}

export async function gameBelongsToCompilation(
	gameId: string,
	compilationGameId: string
): Promise<boolean> {
	return compilationItemsService.existsPair(compilationGameId, gameId);
}

export async function findCompilationParentsForChild(childGameId: string) {
	return compilationItemsService.findByChildGameId(childGameId);
}

function linkedGameIds(items: readonly SetCompilationItemInput[]) {
	return items.flatMap(item => (item.mode === "link" ? [item.gameId] : []));
}

function createdTitles(items: readonly SetCompilationItemInput[]) {
	return items.flatMap(item => (item.mode === "create" ? [item.title] : []));
}

async function loadCompilationParent(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true },
		include: buildCatalogIncludes()
	});
	if (!parent) throw gamesServiceError.notFoundError();
	return parent;
}

function hasDuplicates(values: readonly unknown[]) {
	return new Set(values).size !== values.length;
}

function assertCompilationItemsValid(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	const linkedIds = linkedGameIds(items);
	if (linkedIds.includes(parentGameId) || hasDuplicates(linkedIds))
		throw gamesServiceError.compilationInvalidError();

	const createdSlugs = createdTitles(items).map(titleToSlug);
	if (createdSlugs.some(slug => !slug) || hasDuplicates(createdSlugs))
		throw gamesServiceError.compilationInvalidError();
}

async function assertLinkedGamesExist(linkedIds: readonly string[]) {
	if (linkedIds.length === 0) return;
	const found = await Game.findAll({
		where: { id: [...linkedIds], isActive: true }
	});
	if (found.length !== linkedIds.length)
		throw gamesServiceError.notFoundError();
}

async function createCompilationChildren(
	parent: Game,
	titles: string[],
	inherited: CatalogAssets,
	transaction: Transaction
) {
	if (titles.length === 0) return [];
	const children = await Game.bulkCreate(
		titles.map(title => ({
			title,
			code: titleToSlug(title),
			description: parent.description,
			releaseAt: parent.releaseAt,
			coverUrl: parent.coverUrl,
			backgroundUrl: parent.backgroundUrl,
			isDlc: false,
			isCompilation: false
		})),
		{ validate: true, transaction }
	);
	await cloneCatalogAssetsToGames(
		children.map(child => child.id),
		inherited,
		transaction
	);
	return children;
}
