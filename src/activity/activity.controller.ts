import { Request, Response } from "express";
import { RequestUser } from "../common/interfaces/request-user.interface";
import * as activityService from "./activity.service";
import { activitySerializer } from "./activity.serializer";

export async function getFeed(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;

	const activities = await activityService.getFeed(user.id);

	const data = { activities: activities.map(activitySerializer) };
	return response.status(200).json({ data });
}
