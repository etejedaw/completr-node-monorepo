import { Request, Response } from "express";

import { RequestUser } from "../common/interfaces/request-user.interface";
import { activitySerializer } from "./activity.serializer";
import * as activityService from "./activity.service";

export async function getFeed(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as {
		limit?: number;
		offset?: number;
	};

	const { rows, total } = await activityService.getFeed(
		user.id,
		query?.limit ?? 25,
		query?.offset ?? 0
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
