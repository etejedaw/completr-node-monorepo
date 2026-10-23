import { type Transaction } from "sequelize";

import { rethrowSequelizeError } from "../../common/errors/sequelize-error.mapper";
import { titleToSlug } from "../../common/utils/title-to-slug.util";
import { CompilationItem } from "../../compilation-items/compilation-item.model";
import { sequelize } from "../../database/sequelize.database";
import * as gameGenresService from "../../game-genre/game-genre.service";
import * as gamePlatformsService from "../../game-platform/game-platform.service";
import * as gameScoresService from "../../game-scores/game-scores.service";
import { type TimeSource } from "../../game-times/game-time.model";
import * as gameTimesService from "../../game-times/game-times.service";
import * as gamesServiceError from "../errors/games.service-error";
import { Game } from "../game.model";
import { type SetCompilationItemInput } from "../games.interface";

export async function setCompilationItems(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	const parent = await loadCompilationParent(parentGameId);
	assertCompilationItemsValid(parentGameId, items);

	const linkedIds = items
		.filter(i => i.mode === "link")
		.map(i => (i as { gameId: string }).gameId);
	await assertLinkedGamesExist(linkedIds);

	const inherited = extractParentAssets(parent);

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});

		const children = await createCompilationChildren(
			parent,
			items.flatMap(item => (item.mode === "create" ? [item.title] : [])),
			inherited,
			transaction
		);
		const createdChildIds = children.map(child => child.id);
		const resolvedChildIds = items.map(item =>
			item.mode === "link" ? item.gameId : createdChildIds.shift()!
		);

		if (new Set(resolvedChildIds).size !== resolvedChildIds.length) {
			throw gamesServiceError.compilationInvalidError();
		}

		await CompilationItem.bulkCreate(
			resolvedChildIds.map((childGameId, position) => ({
				parentGameId,
				childGameId,
				position
			})),
			{ validate: true, transaction }
		);

		await parent.update({ isCompilation: true }, { transaction });

		await transaction.commit();

		return await findCompilationItemsByParent(parentGameId);
	} catch (error) {
		await transaction.rollback();
		rethrowSequelizeError(error, {
			unique: gamesServiceError.uniqueConstraintError,
			validation: gamesServiceError.validationError
		});
	}
}

export async function clearCompilation(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true }
	});
	if (!parent) throw gamesServiceError.notFoundError();

	const transaction = await sequelize.transaction();
	try {
		await CompilationItem.destroy({
			where: { parentGameId },
			transaction
		});
		await parent.update({ isCompilation: false }, { transaction });
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

export async function findCompilationItemsByParent(parentGameId: string) {
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
		order: [["position", "ASC"]]
	});
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
	const count = await CompilationItem.count({
		where: { parentGameId: compilationGameId, childGameId: gameId }
	});
	return count > 0;
}

export async function findCompilationParentsForChild(childGameId: string) {
	return CompilationItem.findAll({
		where: { childGameId },
		include: [
			{
				association: "ParentGame",
				where: { isActive: true },
				required: true
			}
		],
		order: [["createdAt", "ASC"]]
	});
}

async function loadCompilationParent(parentGameId: string) {
	const parent = await Game.findOne({
		where: { id: parentGameId, isActive: true },
		include: [
			{ association: "Platforms" },
			{ association: "Genres" },
			{ association: "GameScores" },
			{ association: "GameTimes" }
		]
	});
	if (!parent) throw gamesServiceError.notFoundError();
	return parent;
}

function assertCompilationItemsValid(
	parentGameId: string,
	items: readonly SetCompilationItemInput[]
) {
	for (const item of items) {
		if (item.mode === "link" && item.gameId === parentGameId) {
			throw gamesServiceError.compilationInvalidError();
		}
	}

	const linkedIds = items
		.filter(i => i.mode === "link")
		.map(i => (i as { gameId: string }).gameId);
	if (new Set(linkedIds).size !== linkedIds.length) {
		throw gamesServiceError.compilationInvalidError();
	}

	const createdSlugs = items
		.filter(i => i.mode === "create")
		.map(i => titleToSlug((i as { title: string }).title));
	if (createdSlugs.some(s => !s)) {
		throw gamesServiceError.compilationInvalidError();
	}
	if (new Set(createdSlugs).size !== createdSlugs.length) {
		throw gamesServiceError.compilationInvalidError();
	}
}

async function assertLinkedGamesExist(linkedIds: readonly string[]) {
	if (linkedIds.length === 0) return;
	const found = await Game.findAll({
		where: { id: linkedIds as string[], isActive: true }
	});
	if (found.length !== linkedIds.length) {
		throw gamesServiceError.notFoundError();
	}
}

interface InheritedParentAssets {
	platformIds: string[];
	genreIds: string[];
	scores: { source: string; score: number }[];
	times: { source: TimeSource; duration: number }[];
}

function extractParentAssets(parent: Game): InheritedParentAssets {
	return {
		platformIds: parent.Platforms?.map(p => p.id) ?? [],
		genreIds: parent.Genres?.map(g => g.id) ?? [],
		scores:
			parent.GameScores?.map(s => ({
				source: s.source,
				score: s.score
			})) ?? [],
		times:
			parent.GameTimes?.map(t => ({
				source: t.source,
				duration: t.duration
			})) ?? []
	};
}

async function createCompilationChildren(
	parent: Game,
	titles: string[],
	inherited: InheritedParentAssets,
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
	const childIds = children.map(child => child.id);
	await gamePlatformsService.linkGamesToPlatforms(
		childIds,
		inherited.platformIds,
		transaction
	);
	await gameGenresService.linkGamesToGenres(
		childIds,
		inherited.genreIds,
		transaction
	);
	await gameScoresService.createGameScores(
		childIds.flatMap(gameId =>
			inherited.scores.map(score => ({ gameId, ...score }))
		),
		transaction
	);
	await gameTimesService.createGameTimes(
		childIds.flatMap(gameId =>
			inherited.times.map(time => ({ gameId, ...time }))
		),
		transaction
	);
	return children;
}
