import { Request, Response, NextFunction } from "express";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./services/token.service";
import { ZodError } from "zod";
import { CustomRequest } from "../common/interfaces/custom-request.interface";
import * as authDomainsErrors from "./errors/auth.domains-error";
import * as userService from "../users/users.service";
import { DomainError } from "../common/errors/domain-error";
import { UserRole } from "../users/user-role.type";

export function authMiddleware(...roles: UserRole[]) {
	return async (
		request: Request,
		_response: Response,
		next: NextFunction
	) => {
		const customRequest = request as CustomRequest;

		try {
			const headers = HeaderTokenSchema.parse(request.headers);

			const [_prefix, token] = headers.authorization.split(" ");
			const payload = tokenService.verifyAccessToken(token!);

			const user = await userService.findUserById(payload.sub);
			if (!user || !user.isActive)
				throw authDomainsErrors.authInvalidToken();

			const customUser = {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
				isActive: user.isActive
			};
			customRequest.user = customUser;

			if (!roles.length) return next();
			if (user.role === "admin") return next();
			if (!roles.includes(user.role))
				throw authDomainsErrors.authForbidden();

			return next();
		} catch (error) {
			if (error instanceof ZodError)
				throw authDomainsErrors.authSchemaInvalid({
					error: JSON.parse(error.message)
				});
			if (error instanceof DomainError) throw error;
			throw authDomainsErrors.authInvalidToken({ error });
		}
	};
}
