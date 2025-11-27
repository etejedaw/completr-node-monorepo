import { Request, Response, NextFunction } from "express";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./token.service";
import { ZodError } from "zod";
import { CustomRequest } from "../common/interfaces/custom-request.interface";
import * as authDomainsErrors from "./errors/auth.domains-error";

export function authMiddleware(
	request: Request,
	_response: Response,
	next: NextFunction
) {
	const customRequest = request as CustomRequest;

	try {
		const headers = HeaderTokenSchema.parse(request.headers);
		const [_prefix, token] = headers.authorization.split(" ");
		const payload = tokenService.verifyAccessToken(token!);
		customRequest.user = payload;
		return next();
	} catch (error) {
		if (error instanceof ZodError)
			throw authDomainsErrors.authSchemaInvalid({ ...error });
		throw authDomainsErrors.authInvalidToken({ error });
	}
}
