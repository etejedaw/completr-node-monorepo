import { type Session } from "./auth.interface";
import { type RefreshToken } from "./refresh-token.model";

export function sessionSerializer(session: RefreshToken) {
	return {
		id: session.id,
		deviceInfo: session.deviceInfo,
		lastUsedAt: session.lastUsedAt,
		createdAt: session.createdAt,
		expiresAt: session.expiresAt
	};
}

export function authTokensSerializer(tokens: Session) {
	return {
		access_token: tokens.accessToken,
		session_id: tokens.sessionId
	};
}
