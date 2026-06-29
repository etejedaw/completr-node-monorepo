import { type NextFunction, type Request, type Response } from "express";

import { type UserRole } from "../users/user-role.type";
import * as userService from "../users/users.service";
import * as authDomainsErrors from "./errors/auth.domains-error";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";

export function hiddenRouteMiddleware(...roles: UserRole[]) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		try {
			const headers = HeaderTokenSchema.parse(request.headers);

			const [_prefix, token] = headers.authorization.split(" ");
			const payload = tokenService.verifyAccessToken(token!);

			const user = await userService.findUserById(payload.sub);
			if (!user || !user.isActive)
				throw authDomainsErrors.authRouteNotFound();

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

			if (user.role === "admin") return next();
			if (roles.includes(user.role)) return next();
			throw authDomainsErrors.authRouteNotFound();
		} catch {
			throw authDomainsErrors.authRouteNotFound();
		}
	};
}
