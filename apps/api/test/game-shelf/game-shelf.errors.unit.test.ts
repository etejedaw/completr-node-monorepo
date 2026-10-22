import { gameShelfDomainToHttpMapper } from "../../src/game-shelf/errors/game-shelf.domain-to-http.mapper";
import { gameShelfErrorDomainNormalizer } from "../../src/game-shelf/errors/game-shelf.error-domain.normalizer";
import { gameShelfServiceToDomainMapper } from "../../src/game-shelf/errors/game-shelf.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "GameShelf",
	service: "GameShelf Service",
	mapper: gameShelfServiceToDomainMapper,
	normalizer: gameShelfErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_SHELF_NOT_FOUND",
			module: "GameShelf Module",
			code: "GAME_SHELF_NOT_FOUND",
			message: "Game shelf entry not found"
		},
		{
			serviceCode: "GAME_SHELF_FORBIDDEN",
			module: "GameShelf Module",
			code: "GAME_SHELF_FORBIDDEN",
			message:
				"You do not have permission to modify this game shelf entry"
		},
		{
			serviceCode: "GAME_SHELF_UNIQUE_CONSTRAINT",
			module: "GameShelf Module",
			code: "GAME_SHELF_UNIQUE_CONSTRAINT",
			message: "Game shelf entry already exists"
		},
		{
			serviceCode: "GAME_SHELF_VALIDATION_ERROR",
			module: "GameShelf Module",
			code: "GAME_SHELF_VALIDATION_ERROR",
			message: "Game shelf validation failed"
		},
		{
			serviceCode: "GAME_SHELF_LIMIT_REACHED",
			module: "GameShelf Module",
			code: "GAME_SHELF_LIMIT_REACHED",
			message: "Game shelf limit reached for free plan"
		}
	],
	fallback: {
		module: "GameShelf Module",
		code: "GAME_SHELF_INTERNAL_ERROR",
		message: "Unexpected GameShelf Service error"
	}
});

describeDomainToHttpMapper({
	name: "GameShelf",
	mapper: gameShelfDomainToHttpMapper,
	cases: [
		{ code: "GAME_SHELF_NOT_FOUND", status: 404 },
		{ code: "GAME_SHELF_FORBIDDEN", status: 403 },
		{ code: "GAME_SHELF_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "GAME_SHELF_VALIDATION_ERROR", status: 400 },
		{ code: "GAME_SHELF_LIMIT_REACHED", status: 402 }
	]
});
