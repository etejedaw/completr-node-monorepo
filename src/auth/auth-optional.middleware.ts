import { Request, Response, NextFunction } from "express";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";
import * as userService from "../users/users.service";

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
		// No valid token — continue as anonymous
	}

	return next();
}
