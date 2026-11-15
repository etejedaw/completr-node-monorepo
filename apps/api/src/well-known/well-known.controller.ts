import { type Request, type Response } from "express";

import { mailConfig } from "../common/config/mail.config";
import { MS_PER_DAY } from "../common/constants/time.constants";

const SECURITY_TXT_VALIDITY_DAYS = 365;

function buildSecurityTxt() {
	const expires = new Date(
		Date.now() + SECURITY_TXT_VALIDITY_DAYS * MS_PER_DAY
	);
	return [
		`Contact: mailto:${mailConfig.SUPPORT_EMAIL}`,
		`Expires: ${expires.toISOString()}`,
		"Preferred-Languages: es, en"
	].join("\n");
}

const ROBOTS_TXT = ["User-agent: *", "Disallow: /"].join("\n");

export function getSecurityTxt(_request: Request, response: Response) {
	return response.type("text/plain").send(buildSecurityTxt());
}

export function getRobotsTxt(_request: Request, response: Response) {
	return response.type("text/plain").send(ROBOTS_TXT);
}
