import { gamePlatinumDomainToHttpMapper } from "../../src/game-platinum/errors/game-platinum.domain-to-http.mapper";
import { gamePlatinumErrorDomainNormalizer } from "../../src/game-platinum/errors/game-platinum.error-domain.normalizer";
import { gamePlatinumServiceToDomainMapper } from "../../src/game-platinum/errors/game-platinum.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

const MODULE = "GamePlatinum Module";

describeModuleErrors({
	name: "GamePlatinum",
	service: "GamePlatinum Service",
	mapper: gamePlatinumServiceToDomainMapper,
	normalizer: gamePlatinumErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_PLATINUM_GAME_NOT_FOUND",
			module: MODULE,
			code: "GAME_PLATINUM_GAME_NOT_FOUND",
			message: "Game not found"
		},
		{
			serviceCode: "GAME_PLATINUM_NOT_FOUND",
			module: MODULE,
			code: "GAME_PLATINUM_NOT_FOUND",
			message: "Platinum not found for this game"
		},
		{
			serviceCode: "GAME_PLATINUM_BACKLOG_NOT_FOUND",
			module: MODULE,
			code: "GAME_PLATINUM_BACKLOG_NOT_FOUND",
			message: "Backlog entry not found"
		},
		{
			serviceCode: "GAME_PLATINUM_BACKLOG_GAME_MISMATCH",
			module: MODULE,
			code: "GAME_PLATINUM_BACKLOG_GAME_MISMATCH",
			message: "Backlog entry belongs to another game"
		},
		{
			serviceCode: "GAME_PLATINUM_PLATFORM_NOT_FOUND",
			module: MODULE,
			code: "GAME_PLATINUM_PLATFORM_NOT_FOUND",
			message: "Platform not found"
		},
		{
			serviceCode: "GAME_PLATINUM_UNIQUE_CONSTRAINT",
			module: MODULE,
			code: "GAME_PLATINUM_UNIQUE_CONSTRAINT",
			message: "Platinum already exists for this game"
		},
		{
			serviceCode: "GAME_PLATINUM_VALIDATION_ERROR",
			module: MODULE,
			code: "GAME_PLATINUM_VALIDATION_ERROR",
			message: "Platinum validation error"
		}
	],
	fallback: {
		module: MODULE,
		code: "GAME_PLATINUM_INTERNAL_ERROR",
		message: "Unexpected GamePlatinum Service error"
	}
});

describeDomainToHttpMapper({
	name: "GamePlatinum",
	mapper: gamePlatinumDomainToHttpMapper,
	cases: [
		{ code: "GAME_PLATINUM_GAME_NOT_FOUND", status: 404 },
		{ code: "GAME_PLATINUM_NOT_FOUND", status: 404 },
		{ code: "GAME_PLATINUM_BACKLOG_NOT_FOUND", status: 404 },
		{ code: "GAME_PLATINUM_BACKLOG_GAME_MISMATCH", status: 422 },
		{ code: "GAME_PLATINUM_PLATFORM_NOT_FOUND", status: 422 },
		{ code: "GAME_PLATINUM_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "GAME_PLATINUM_VALIDATION_ERROR", status: 400 }
	]
});
