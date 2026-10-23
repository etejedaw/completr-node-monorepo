import { gameExternalDomainToHttpMapper } from "../../src/game-external/errors/game-external.domain-to-http.mapper";
import { gameExternalErrorDomainNormalizer } from "../../src/game-external/errors/game-external.error-domain.normalizer";
import { gameExternalServiceToDomainMapper } from "../../src/game-external/errors/game-external.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Game external",
	service: "Game External Service",
	mapper: gameExternalServiceToDomainMapper,
	normalizer: gameExternalErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_EXTERNAL_NOT_FOUND",
			module: "Game External Module",
			code: "GAME_EXTERNAL_NOT_FOUND",
			message: "External ID not found"
		},
		{
			serviceCode: "GAME_EXTERNAL_UNIQUE_CONSTRAINT",
			module: "Game External Module",
			code: "GAME_EXTERNAL_ALREADY_EXISTS",
			message: "External ID already exists for this game and source"
		}
	],
	fallback: {
		module: "Game External Module",
		code: "GAME_EXTERNAL_INTERNAL_ERROR",
		message: "Unexpected Game External Service error"
	}
});

describeDomainToHttpMapper({
	name: "Game external",
	mapper: gameExternalDomainToHttpMapper,
	cases: [
		{ code: "GAME_EXTERNAL_NOT_FOUND", status: 404 },
		{ code: "GAME_EXTERNAL_ALREADY_EXISTS", status: 409 }
	]
});
