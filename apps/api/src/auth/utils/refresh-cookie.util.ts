import { type Response } from "express";

import { environmentConfig } from "../../common/config/environment.config";
import { MS_PER_DAY } from "../../common/constants/time.constants";

export const REFRESH_COOKIE_NAME = "refresh_token";

function baseOptions() {
	return {
		httpOnly: true,
		secure: environmentConfig.COOKIE_SECURE,
		sameSite: environmentConfig.COOKIE_SAME_SITE,
		domain: environmentConfig.COOKIE_DOMAIN,
		path: "/auth"
	} as const;
}

export function setRefreshCookie(response: Response, token: string) {
	const maxAge = environmentConfig.REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY;
	response.cookie(REFRESH_COOKIE_NAME, token, { ...baseOptions(), maxAge });
}

export function clearRefreshCookie(response: Response) {
	response.clearCookie(REFRESH_COOKIE_NAME, baseOptions());
}
