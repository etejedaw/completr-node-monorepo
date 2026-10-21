import assert from "node:assert/strict";

import { type User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "./app.helper";
import { createUser, DEFAULT_PASSWORD } from "./factories.helper";

const REFRESH_COOKIE_NAME = "refresh_token";

export interface Session {
	accessToken: string;
	sessionId: string;
	refreshToken: string;
	refreshCookie: string;
}

export function bearer(accessToken: string) {
	return `Bearer ${accessToken}`;
}

export function extractRefreshCookie(setCookie: string[] | string | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
	const cookie = cookies.find(value =>
		value.startsWith(`${REFRESH_COOKIE_NAME}=`)
	);
	assert.ok(cookie, "response did not set the refresh cookie");
	return cookie;
}

export function refreshTokenFromCookie(cookie: string) {
	const [pair] = cookie.split(";");
	return decodeURIComponent(pair!.slice(REFRESH_COOKIE_NAME.length + 1));
}

export async function login(
	email: string,
	password = DEFAULT_PASSWORD
): Promise<Session> {
	const response = await api()
		.post("/auth/login")
		.send({ email, password })
		.expect(200);

	const refreshCookie = extractRefreshCookie(response.headers["set-cookie"]);
	return {
		accessToken: response.body.data.access_token,
		sessionId: response.body.data.session_id,
		refreshToken: refreshTokenFromCookie(refreshCookie),
		refreshCookie
	};
}

export async function createUserWithSession(
	role: UserRole = "user"
): Promise<{ user: User; session: Session; authorization: string }> {
	const user = await createUser({ role });
	const session = await login(user.email);
	return { user, session, authorization: bearer(session.accessToken) };
}
