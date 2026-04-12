import { Request, Response, NextFunction } from "express";

const SECURITY_TXT = [
	"Contact: mailto:etejedaw@hotmail.com",
	"Preferred-Languages: es, en"
].join("\n");

export function securityTxtMiddleware(
	request: Request,
	response: Response,
	next: NextFunction
) {
	if (request.path === "/.well-known/security.txt") {
		return response.type("text/plain").send(SECURITY_TXT);
	}
	return next();
}
