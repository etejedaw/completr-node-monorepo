import { type Request, type Response } from "express";

const SECURITY_TXT = [
	"Contact: mailto:completr@etejeda.dev",
	"Preferred-Languages: es, en"
].join("\n");

const ROBOTS_TXT = ["User-agent: *", "Disallow: /"].join("\n");

export function getSecurityTxt(_request: Request, response: Response) {
	return response.type("text/plain").send(SECURITY_TXT);
}

export function getRobotsTxt(_request: Request, response: Response) {
	return response.type("text/plain").send(ROBOTS_TXT);
}
