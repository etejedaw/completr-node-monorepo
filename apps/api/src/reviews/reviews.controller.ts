import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import { type GameIdParam } from "../games/schemas/game-id-params.schema";
import { findFullPremiumUserIds } from "../premium-access/services/premium-access.service";
import { type CreateReviewDto } from "./dtos/create-review.dto";
import { type UpdateReviewDto } from "./dtos/update-review.dto";
import { reviewSerializer } from "./reviews.serializer";
import * as reviewsService from "./reviews.service";

export async function postReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as CreateReviewDto;

	const review = await reviewsService.createReview(user.id, params.id, body);
	const premiumUserIds = await findFullPremiumUserIds([user]);

	activityService.record(user.id, "game_reviewed", params.id);

	const data = {
		review: reviewSerializer(
			review.get({ plain: true }),
			null,
			premiumUserIds.has(user.id)
		)
	};
	return response.status(201).json({ data });
}

export async function getReviews(request: Request, response: Response) {
	const params = request.locals.params as GameIdParam;
	const query = request.locals.query as PaginationQuery;
	const viewer = request.locals.user as RequestUser;

	const { rows, count } = await reviewsService.findReviewsByGameId(
		params.id,
		query
	);
	const reviewsPlain = rows.map(r => r.get({ plain: true }));

	const pairs = reviewsPlain
		.filter(r => r.User)
		.map(r => ({ userId: r.User.id, gameId: params.id }));
	const [durationMap, premiumUserIds] = await Promise.all([
		backlogService.findLatestCompletedDurations(pairs, {
			visibleTo: viewer.id
		}),
		findFullPremiumUserIds(
			reviewsPlain.flatMap(review => (review.User ? [review.User] : []))
		)
	]);

	const data = {
		total: count,
		reviews: reviewsPlain.map(r =>
			reviewSerializer(
				r,
				r.User
					? (durationMap.get(`${r.User.id}:${params.id}`) ?? null)
					: null,
				r.User ? premiumUserIds.has(r.User.id) : false
			)
		)
	};
	return response.status(200).json({ data });
}

export async function patchReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;
	const body = request.locals.body as UpdateReviewDto;

	const { review, changed } = await reviewsService.updateReviewByGame(
		user.id,
		params.id,
		body
	);
	const premiumUserIds = await findFullPremiumUserIds([user]);

	if (changed) activityService.record(user.id, "game_reviewed", params.id);

	const data = {
		review: reviewSerializer(
			review.get({ plain: true }),
			null,
			premiumUserIds.has(user.id)
		)
	};
	return response.status(200).json({ data });
}

export async function deleteReview(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const params = request.locals.params as GameIdParam;

	await reviewsService.deleteReviewByGame(user.id, params.id);
	return response.sendStatus(204);
}
