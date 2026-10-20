import { type Request, type Response } from "express";

import { type RequestUser } from "../common/interfaces/request-user.interface";
import { type PaginationQuery } from "../common/schemas/pagination-query.schema";
import { userMeSerializer } from "../users";
import * as authService from "./auth.service";
import {
	type ChangePasswordDto,
	type ForgotPasswordDto,
	type LoginDto,
	type RefreshTokenDto,
	type RegisterDto,
	type ResetPasswordDto
} from "./dtos";
import * as authDomainError from "./errors/auth.domains-error";
import { type SessionIdParams } from "./schemas/session-id-params.schema";
import {
	clearRefreshCookie,
	REFRESH_COOKIE_NAME,
	setRefreshCookie
} from "./utils/refresh-cookie.util";

function getDeviceInfo(request: Request): string {
	return (request.headers["user-agent"] ?? "Unknown device").slice(0, 500);
}

function getRefreshToken(request: Request): string {
	const fromCookie = request.cookies?.[REFRESH_COOKIE_NAME] as
		string | undefined;
	const fromBody = (request.locals.body as RefreshTokenDto)?.refresh_token;
	const token = fromCookie ?? fromBody;
	if (!token) throw authDomainError.invalidRefreshToken();
	return token;
}

export async function postRegister(request: Request, response: Response) {
	const registerDto = request.locals.body as RegisterDto;

	const userRegister = await authService.register(
		registerDto,
		getDeviceInfo(request)
	);

	const userPlain = userRegister.user.get({ plain: true });

	setRefreshCookie(response, userRegister.refreshToken);

	const data = {
		user: userMeSerializer(userPlain),
		access_token: userRegister.accessToken,
		session_id: userRegister.sessionId
	};

	return response.status(201).json({ data });
}

export async function postLogin(request: Request, response: Response) {
	const loginDto = request.locals.body as LoginDto;

	const userLogin = await authService.login(loginDto, getDeviceInfo(request));

	setRefreshCookie(response, userLogin.refreshToken);

	const data = {
		access_token: userLogin.accessToken,
		session_id: userLogin.sessionId
	};

	return response.status(200).json({ data });
}

export async function postRefresh(request: Request, response: Response) {
	const refreshToken = getRefreshToken(request);

	const tokens = await authService.refresh(
		refreshToken,
		getDeviceInfo(request)
	);

	setRefreshCookie(response, tokens.refreshToken);

	const data = {
		access_token: tokens.accessToken,
		session_id: tokens.sessionId
	};

	return response.status(200).json({ data });
}

export async function postLogout(request: Request, response: Response) {
	const fromCookie = request.cookies?.[REFRESH_COOKIE_NAME] as
		string | undefined;
	const fromBody = (request.locals.body as RefreshTokenDto)?.refresh_token;
	const refreshToken = fromCookie ?? fromBody;

	if (refreshToken) await authService.logout(refreshToken);

	clearRefreshCookie(response);

	return response.sendStatus(204);
}

export async function patchChangePassword(
	request: Request,
	response: Response
) {
	const changePassword = request.locals.body as ChangePasswordDto;

	const user = request.locals.user as RequestUser;

	await authService.changePassword(user.id, changePassword.password);

	return response.sendStatus(204);
}

export function postForgotPassword(request: Request, response: Response) {
	const { email } = request.locals.body as ForgotPasswordDto;

	authService.requestPasswordReset(email);

	return response.sendStatus(204);
}

export async function postResetPassword(request: Request, response: Response) {
	const { token, password } = request.locals.body as ResetPasswordDto;

	await authService.resetPassword(token, password);

	return response.sendStatus(204);
}

export async function getSessions(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const query = request.locals.query as PaginationQuery;

	const { sessions, total } = await authService.listSessions(user.id, {
		limit: query.limit,
		offset: query.offset
	});

	const data = {
		sessions: sessions.map(s => ({
			id: s.id,
			deviceInfo: s.deviceInfo,
			lastUsedAt: s.lastUsedAt,
			createdAt: s.createdAt,
			expiresAt: s.expiresAt
		})),
		total
	};

	return response.status(200).json({ data });
}

export async function deleteSession(request: Request, response: Response) {
	const user = request.locals.user as RequestUser;
	const { sessionId } = request.locals.params as SessionIdParams;

	await authService.revokeSession(sessionId, user.id);

	return response.sendStatus(204);
}

export async function deleteOtherSessions(
	request: Request,
	response: Response
) {
	const user = request.locals.user as RequestUser;
	const { sessionId } = request.locals.params as SessionIdParams;

	const revoked = await authService.revokeOtherSessions(user.id, sessionId);

	return response.status(200).json({ data: { revoked } });
}
