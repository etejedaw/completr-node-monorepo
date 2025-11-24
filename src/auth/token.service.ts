import jwt from "jsonwebtoken";
import { JwtPayload } from "./interfaces/auth-request.interface";
import { environmentConfig } from "../common/config/environment.config";
import type { StringValue } from "ms";

export function signAccessToken(payload: JwtPayload) {
	return jwt.sign(payload, environmentConfig.ACCESS_TOKEN_SECRET, {
		expiresIn: environmentConfig.ACCESS_TOKEN_TTL as StringValue
	});
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(token, environmentConfig.ACCESS_TOKEN_SECRET) as JwtPayload;
}
