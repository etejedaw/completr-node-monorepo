import { col, fn, literal, Op, type Transaction } from "sequelize";

import { CHRONOLOGICAL_ORDER } from "../common/constants/chronological-order.constants";
import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { GAME_REFERENCE_ATTRS } from "../games/games.constants";
import * as gamesService from "../games/games.service";
import { USER_PUBLIC_ATTRS } from "../users/constants/user-attrs.constants";
import * as usersService from "../users/users.service";
import { type CreateReviewDto } from "./dtos/create-review.dto";
import { type UpdateReviewDto } from "./dtos/update-review.dto";
import * as reviewsServiceError from "./errors/reviews.service-error";
import { Review } from "./review.model";

const LATEST_REVIEWED_GAMES_LIMIT = 16;
const DEFAULT_USER_REVIEWS_LIMIT = 50;
const REVIEW_GAME_ATTRS = ["id", "code", "title", "coverUrl", "backgroundUrl"];

const hasContent = literal(`"content" IS NOT NULL AND btrim("content") <> ''`);
const reviewedGameIsActive = literal(
	`"gameId" IN (SELECT "id" FROM "Games" WHERE "isActive" = true)`
);
const hasContentOrRating = literal(
	`(("content" IS NOT NULL AND btrim("content") <> '') OR "rating" IS NOT NULL)`
);

export async function createReview(
	userId: string,
	gameId: string,
	dto: CreateReviewDto,
	transaction?: Transaction
) {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw reviewsServiceError.gameNotFoundError();

	const existing = await Review.findOne({
		where: { userId, gameId },
		transaction
	});
	if (existing) throw reviewsServiceError.alreadyExistsError();

	try {
		return await Review.create(
			{
				userId,
				gameId,
				content: dto.content,
				rating: dto.rating
			},
			{ transaction }
		);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => reviewsServiceError.alreadyExistsError()
		});
	}
}

export async function findReviewsByGameId(gameId: string) {
	return Review.findAll({
		where: { gameId },
		include: [
			{
				...usersService.userInclude(),
				attributes: USER_PUBLIC_ATTRS
			}
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		]
	});
}

export async function findReviewsByUserIdPaginated(
	userId: string,
	options: { limit?: number; offset?: number } = {}
) {
	const { limit = DEFAULT_USER_REVIEWS_LIMIT, offset = 0 } = options;
	return Review.findAndCountAll({
		where: { userId, [Op.and]: hasContentOrRating },
		include: [
			{ ...gamesService.gameInclude(), attributes: REVIEW_GAME_ATTRS }
		],
		order: [
			["createdAt", "DESC"],
			["id", "DESC"]
		],
		limit,
		offset,
		distinct: true
	});
}

export async function findReviewByUserAndGame(
	userId: string,
	gameId: string,
	transaction?: Transaction
) {
	return Review.findOne({ where: { userId, gameId }, transaction });
}

export async function findReviewContentByUserAndGameIds(
	userId: string,
	gameIds: string[]
) {
	const rows = (await Review.findAll({
		where: {
			userId,
			gameId: { [Op.in]: gameIds }
		},
		attributes: ["gameId", "content", "rating"],
		raw: true
	})) as unknown as {
		gameId: string;
		content: string | null;
		rating: number | null;
	}[];
	return new Map(
		rows.map(r => [r.gameId, { content: r.content, rating: r.rating }])
	);
}

export async function findAggregatedRatingsByGame() {
	return (await Review.findAll({
		attributes: [
			"gameId",
			[fn("AVG", col("rating")), "avgRating"],
			[fn("COUNT", col("rating")), "reviewCount"]
		],
		where: { rating: { [Op.not]: null } },
		group: ["gameId"],
		raw: true
	})) as unknown as {
		gameId: string;
		avgRating: number;
		reviewCount: number;
	}[];
}

export async function findLatestReviewedGameIds(
	limit = LATEST_REVIEWED_GAMES_LIMIT
) {
	const rows = (await Review.findAll({
		where: { [Op.and]: [hasContent, reviewedGameIsActive] },
		attributes: ["gameId", [fn("MAX", col("createdAt")), "lastReviewedAt"]],
		group: ["gameId"],
		order: [
			[fn("MAX", col("createdAt")), "DESC"],
			["gameId", "DESC"]
		],
		limit,
		raw: true
	})) as unknown as { gameId: string }[];

	return rows.map(r => r.gameId);
}

export async function updateReviewByGame(
	userId: string,
	gameId: string,
	dto: UpdateReviewDto
) {
	const review = await findReviewByUserAndGame(userId, gameId);
	if (!review) throw reviewsServiceError.notFoundError();

	review.set(dto);
	const changed = review.changed() !== false;
	if (changed) await review.save();
	return { review, changed };
}

export async function deleteReviewByGame(userId: string, gameId: string) {
	const deleted = await Review.destroy({ where: { userId, gameId } });
	if (deleted === 0) throw reviewsServiceError.notFoundError();
}

export async function existsByGameId(
	gameId: string,
	transaction?: Transaction
) {
	return (
		(await Review.findOne({
			where: { gameId: gameId },
			attributes: ["id"],
			transaction
		})) !== null
	);
}

export async function findReviewsForDataExport(userId: string) {
	return Review.findAll({
		where: { userId },
		include: [
			{ ...gamesService.gameInclude(), attributes: GAME_REFERENCE_ATTRS }
		],
		order: CHRONOLOGICAL_ORDER
	});
}
