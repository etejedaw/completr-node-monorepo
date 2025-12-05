import { authDomainToHttpMapper } from "../../auth/errors/auth.domain-to-http.mapper";
import { usersDomainToHttpMapper } from "../../users/errors/users.domain-to-http.mapper";
import { CustomRequest } from "../interfaces/custom-request.interface";
import { commonDomainToHttpMapper } from "./common.domain-to-http.mapper";
import { DomainError } from "./domain-error";
import { HttpError } from "./http-error";

export function globalErrorHttpNormalizer(
	error: DomainError,
	request: CustomRequest
) {
	console.log(error);
	if (error.module === "User Module")
		return usersDomainToHttpMapper(error, request);

	if (error.module === "Auth Module")
		return authDomainToHttpMapper(error, request);

	if (error.module === "Common Module")
		return commonDomainToHttpMapper(error, request);

	return new HttpError({
		type: error.code,
		title: error.message,
		status: 500,
		instance: request.originalUrl,
		timestamp: new Date(),
		correlationId: request.correlationId,
		context: error.context
	});
}
