import { authDomainToHttpMapper } from "../../auth/errors/auth.domain-to-http.mapper";
import { usersDomainToHttpMapper } from "../../users/errors/users.domain-to-http.mapper";
import { gamesDomainToHttpMapper } from "../../games/errors/games.domain-to-http.mapper";
import { platformsDomainToHttpMapper } from "../../platforms/errors/platforms.domain-to-http.mapper";
import { genresDomainToHttpMapper } from "../../genres/errors/genres.domain-to-http.mapper";
import { gameShelfDomainToHttpMapper } from "../../game-shelf/errors/game-shelf.domain-to-http.mapper";
import { CustomRequest } from "../interfaces/custom-request.interface";
import { commonDomainToHttpMapper } from "./common.domain-to-http.mapper";
import { DomainError } from "./domain-error";
import { HttpError } from "./http-error";

export function globalErrorHttpNormalizer(
	error: DomainError,
	request: CustomRequest
) {
	if (error.module === "User Module")
		return usersDomainToHttpMapper(error, request);

	if (error.module === "Auth Module")
		return authDomainToHttpMapper(error, request);

	if (error.module === "Game Module")
		return gamesDomainToHttpMapper(error, request);

	if (error.module === "Platform Module")
		return platformsDomainToHttpMapper(error, request);

	if (error.module === "Genre Module")
		return genresDomainToHttpMapper(error, request);

	if (error.module === "GameShelf Module")
		return gameShelfDomainToHttpMapper(error, request);

	if (error.module === "Common Module" || error.module === "COMMON")
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
