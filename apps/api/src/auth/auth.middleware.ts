import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import { PinoLogger } from "../common/logger/pino.logger";
import * as userService from "../users/services/users.service";
import { type UserRole } from "../users/user-role.type";
import * as authDomainsErrors from "./errors/auth.domain-error";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";
import { toRequestUser } from "./utils/request-user.util";

const logger = new PinoLogger("Auth Middleware");

export function authMiddleware(...roles: UserRole[]) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		const payload = readAccessToken(request);

		const user = await userService.findUserById(payload.sub);
		if (!user) throw authDomainsErrors.authInvalidToken();

		request.locals = { ...request.locals, user: toRequestUser(user) };

		if (payload.sid) {
			tokenService.touchSessionLastUsed(payload.sid).catch(error =>
				logger.warn("touchSessionLastUsed", "failed", {
					error:
						error instanceof Error ? error.message : String(error)
				})
			);
		}

		if (roles.length && user.role !== "admin" && !roles.includes(user.role))
			throw authDomainsErrors.authForbidden();

		return next();
	};
}

function readAccessToken(request: Request) {
	try {
		const headers = HeaderTokenSchema.parse(request.headers);
		const [, token] = headers.authorization.split(" ");
		return tokenService.verifyAccessToken(token!);
	} catch (error) {
		if (error instanceof ZodError)
			throw authDomainsErrors.authSchemaInvalid({
				error: JSON.parse(error.message)
			});
		if (error instanceof jwt.JsonWebTokenError)
			throw authDomainsErrors.authInvalidToken({ error });
		throw error;
	}
}
