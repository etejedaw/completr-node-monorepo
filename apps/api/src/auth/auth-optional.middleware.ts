import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import * as userService from "../users/users.service";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";
import { toRequestUser } from "./utils/request-user.util";

export async function authOptionalMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	try {
		const headers = HeaderTokenSchema.parse(request.headers);
		const [, token] = headers.authorization.split(" ");
		const payload = tokenService.verifyAccessToken(token!);

		const user = await userService.findUserById(payload.sub);
		if (user)
			request.locals = { ...request.locals, user: toRequestUser(user) };
	} catch (error) {
		if (!(
			error instanceof ZodError || error instanceof jwt.JsonWebTokenError
		))
			throw error;
	}

	return next();
}
