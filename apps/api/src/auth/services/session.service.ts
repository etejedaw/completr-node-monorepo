import { type User } from "../../users/user.model";
import * as tokenService from "./token.service";

export async function issueSession(user: User, deviceInfo?: string) {
	const { rawToken: refreshToken, sessionId } =
		await tokenService.createRefreshToken(user.id, deviceInfo);
	const accessToken = tokenService.signAccessToken({
		sub: user.id,
		username: user.username,
		email: user.email,
		sid: sessionId
	});
	return { accessToken, refreshToken, sessionId };
}
