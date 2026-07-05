import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type ActivityType } from "./activity.model";
import { activitySerializer } from "./activity.serializer";
import * as activityService from "./activity.service";
import { type FeedCategory } from "./activity.service";
import * as activityDomainError from "./errors/activity.domain-error";

const PREMIUM_ROLES = ["premium", "moderator", "admin"];

export async function getFeed(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as {
		limit?: number;
		offset?: number;
		category?: FeedCategory;
		types?: ActivityType[];
	};

	const hasFilter = Boolean(query.category || query.types?.length);
	if (hasFilter && !PREMIUM_ROLES.includes(user.role))
		throw activityDomainError.feedFilterPremiumRequired();

	const { rows, total } = await activityService.getFeed(
		user.id,
		query.limit ?? 25,
		query.offset ?? 0,
		{ category: query.category, types: query.types }
	);

	const data = {
		activities: rows.map(activitySerializer),
		total
	};
	return response.status(200).json({ data });
}

export async function deleteActivity(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { activityId } = request.locals.params as { activityId: string };

	const deleted = await activityService.deleteActivity(activityId, user.id);
	if (!deleted) return response.sendStatus(404);

	return response.sendStatus(204);
}
