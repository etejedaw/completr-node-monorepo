import { gameTimesDomainToHttpMapper } from "../../src/game-times/errors/game-times.domain-to-http.mapper";
import { gameTimesErrorDomainNormalizer } from "../../src/game-times/errors/game-times.error-domain.normalizer";
import { gameTimesServiceToDomainMapper } from "../../src/game-times/errors/game-times.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "GameTimes",
	service: "GameTime Service",
	mapper: gameTimesServiceToDomainMapper,
	normalizer: gameTimesErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_TIME_NOT_FOUND",
			module: "GameTime Module",
			code: "GAME_TIME_NOT_FOUND",
			message: "Game time not found"
		},
		{
			serviceCode: "GAME_TIME_GAME_NOT_FOUND",
			module: "GameTime Module",
			code: "GAME_TIME_GAME_NOT_FOUND",
			message: "Game does not exist"
		},
		{
			serviceCode: "GAME_TIME_UNIQUE_CONSTRAINT",
			module: "GameTime Module",
			code: "GAME_TIME_ALREADY_EXISTS",
			message: "A time for this game and source already exists"
		}
	],
	fallback: {
		module: "GameTime Module",
		code: "GAME_TIME_INTERNAL_ERROR",
		message: "Unexpected GameTime Service error"
	}
});

describeDomainToHttpMapper({
	name: "GameTimes",
	mapper: gameTimesDomainToHttpMapper,
	cases: [
		{ code: "GAME_TIME_NOT_FOUND", status: 404 },
		{ code: "GAME_TIME_GAME_NOT_FOUND", status: 404 },
		{ code: "GAME_TIME_ALREADY_EXISTS", status: 409 }
	]
});
