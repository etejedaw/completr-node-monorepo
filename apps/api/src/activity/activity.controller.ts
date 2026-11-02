import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import {
	findFullPremiumUserIds,
	resolvePremiumAccess
} from "../premium-access/premium-access.service";
import { activitySerializer } from "./activity.serializer";
import * as activityService from "./activity.service";
import * as activityDomainError from "./errors/activity.domain-error";
import { type ActivityIdParams } from "./schemas/activity-id-params.schema";
import { type FeedQuery } from "./schemas/feed-query.schema";

export async function getFeed(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as FeedQuery;

	const hasFilter = Boolean(query.category || query.types?.length);
	if (hasFilter) {
		const premiumAccess = await resolvePremiumAccess(
			user,
			"activity.feed-filters"
		);
		if (!premiumAccess.allowed)
			throw activityDomainError.feedFilterPremiumRequired();
	}

	const { rows, total } = await activityService.getFeed(
		user.id,
		query.limit ?? 25,
		query.offset ?? 0,
		{ category: query.category, types: query.types }
	);

	const premiumUserIds = await findFullPremiumUserIds(
		rows.flatMap(activity =>
			[activity.User, activity.ActivityUser?.TargetUser].filter(
				user => user !== undefined
			)
		)
	);
	const data = {
		activities: rows.map(activity =>
			activitySerializer(activity, premiumUserIds)
		),
		total
	};
	return response.status(200).json({ data });
}

export async function deleteActivity(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { activityId } = request.locals.params as ActivityIdParams;

	const deleted = await activityService.deleteActivity(activityId, user.id);
	if (!deleted) return response.sendStatus(404);

	return response.sendStatus(204);
}
