import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./interfaces/auth-request.interface";
import { HeaderTokenSchema } from "./schemas";
import * as tokenService from "./token.service";
import { ZodError } from "zod";

export function authMiddleware(
	request: Request,
	response: Response,
	next: NextFunction
) {
	const authRequest = request as AuthRequest;
	try {
		const headers = HeaderTokenSchema.parse(request.headers);
		const [_prefix, token] = headers.authorization.split(" ");
		const payload = tokenService.verifyAccessToken(token!);
		authRequest.user = payload;
		next();
	} catch (error) {
		if (error instanceof ZodError)
			return response.status(422).json({ error: JSON.parse(error.message) });
		return response.sendStatus(401);
	}
}
