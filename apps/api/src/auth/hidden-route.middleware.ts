import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import { type UserRole } from "../users/user-role.type";
import * as userService from "../users/users.service";
import * as authDomainsErrors from "./errors/auth.domains-error";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";
import { toRequestUser } from "./utils/request-user.util";

export function hiddenRouteMiddleware(...roles: UserRole[]) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		const payload = readAccessToken(request);

		const user = await userService.findUserById(payload.sub);
		if (!user) throw authDomainsErrors.authRouteNotFound();

		request.locals = { ...request.locals, user: toRequestUser(user) };

		if (user.role === "admin" || roles.includes(user.role)) return next();
		throw authDomainsErrors.authRouteNotFound();
	};
}

function readAccessToken(request: Request) {
	try {
		const headers = HeaderTokenSchema.parse(request.headers);
		const [, token] = headers.authorization.split(" ");
		return tokenService.verifyAccessToken(token!);
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError)
			throw authDomainsErrors.authInvalidToken({ error });
		if (error instanceof ZodError || error instanceof jwt.JsonWebTokenError)
			throw authDomainsErrors.authRouteNotFound();
		throw error;
	}
}
