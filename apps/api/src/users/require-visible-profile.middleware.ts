import { type NextFunction, type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type VisibilitySection } from "./constants/visibility.constants";
import { type UsernameParam } from "./schemas/username-params.schema";
import { requireVisibleUser } from "./services/users-profile.service";

export function requireVisibleProfileMiddleware(section: VisibilitySection) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		const { username } = request.locals.params as UsernameParam;
		const viewer = request.locals.user as RequestUser | undefined;

		const profileOwner = await requireVisibleUser(viewer?.id, username, [
			"profile",
			section
		]);

		request.locals = { ...request.locals, profileOwner };

		return next();
	};
}
