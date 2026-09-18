import { type NextFunction, type Request, type Response } from "express";

import * as userService from "../users/users.service";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";

export async function authOptionalMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	try {
		const headers = HeaderTokenSchema.parse(request.headers);

		const [_prefix, token] = headers.authorization.split(" ");
		const payload = tokenService.verifyAccessToken(token!);

		const user = await userService.findUserById(payload.sub);
		if (user && user.isActive) {
			request.locals = {
				...request.locals,
				user: {
					id: user.id,
					username: user.username,
					email: user.email,
					role: user.role,
					isActive: user.isActive
				}
			};
		}
	} catch {
		return next();
	}

	return next();
}
