import { type Request, type Response } from "express";

import * as activityService from "../activity/activity.service";
import * as backlogService from "../backlog/backlog.service";
import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type GameIdParam } from "../games/schemas/game-id-params.schema";
import { findFullPremiumUserIds } from "../premium-access/premium-access.service";
import { type CreateReviewDto } from "./dtos/create-review.dto";
import { type UpdateReviewDto } from "./dtos/update-review.dto";
import * as reviewsServiceError from "./errors/reviews.service-error";
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

	const reviews = await reviewsService.findReviewsByGameId(params.id);
	const reviewsPlain = reviews.map(r => r.get({ plain: true }));

	const pairs = reviewsPlain
		.filter(r => r.User)
		.map(r => ({ userId: r.User.id, gameId: params.id }));
	const [durationMap, premiumUserIds] = await Promise.all([
		backlogService.findLatestCompletedDurations(pairs),
		findFullPremiumUserIds(
			reviewsPlain.flatMap(review => (review.User ? [review.User] : []))
		)
	]);

	const data = {
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

	const existing = await reviewsService.findReviewByUserAndGame(
		user.id,
		params.id
	);
	if (!existing) throw reviewsServiceError.notFoundError();

	const review = await reviewsService.updateReview(
		existing.id,
		user.id,
		body
	);
	const premiumUserIds = await findFullPremiumUserIds([user]);

	activityService.record(user.id, "game_reviewed", params.id);

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

	const existing = await reviewsService.findReviewByUserAndGame(
		user.id,
		params.id
	);
	if (!existing) throw reviewsServiceError.notFoundError();

	await reviewsService.deleteReview(existing.id, user.id);
	return response.sendStatus(204);
}
