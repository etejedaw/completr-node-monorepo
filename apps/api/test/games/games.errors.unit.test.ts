import { gamesDomainToHttpMapper } from "../../src/games/errors/games.domain-to-http.mapper";
import { gamesErrorDomainNormalizer } from "../../src/games/errors/games.error-domain.normalizer";
import { gamesServiceToDomainMapper } from "../../src/games/errors/games.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Games",
	service: "Games Service",
	mapper: gamesServiceToDomainMapper,
	normalizer: gamesErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_NOT_FOUND",
			module: "Game Module",
			code: "GAME_NOT_FOUND",
			message: "Game not found"
		},
		{
			serviceCode: "GAME_PLATFORM_NOT_FOUND",
			module: "Game Module",
			code: "GAME_PLATFORM_NOT_FOUND",
			message: "One or more platforms not found"
		},
		{
			serviceCode: "GAME_SCORE_SOURCE_NOT_FOUND",
			module: "Game Module",
			code: "GAME_SCORE_SOURCE_NOT_FOUND",
			message: "One or more score sources do not exist in the catalog"
		},
		{
			serviceCode: "GAME_GENRE_NOT_FOUND",
			module: "Game Module",
			code: "GAME_GENRE_NOT_FOUND",
			message: "One or more genres not found"
		},
		{
			serviceCode: "GAME_UNIQUE_CONSTRAINT",
			module: "Game Module",
			code: "GAME_UNIQUE_CONSTRAINT",
			message: "Game already exists"
		},
		{
			serviceCode: "GAME_VALIDATION_ERROR",
			module: "Game Module",
			code: "GAME_VALIDATION_ERROR",
			message: "Game validation failed"
		},
		{
			serviceCode: "GAME_VARIANT_REQUIRED",
			module: "Game Module",
			code: "GAME_VARIANT_REQUIRED",
			message:
				"Variant label is required when multiple games share the same external id"
		},
		{
			serviceCode: "GAME_SPLIT_INVALID",
			module: "Game Module",
			code: "GAME_SPLIT_INVALID",
			message: "Split request is invalid"
		},
		{
			serviceCode: "GAME_COMPILATION_INVALID",
			module: "Game Module",
			code: "GAME_COMPILATION_INVALID",
			message: "Compilation update is invalid"
		},
		{
			serviceCode: "GAME_IN_USE",
			module: "Game Module",
			code: "GAME_IN_USE",
			message:
				"Game is referenced by user data or other games and cannot be deleted"
		}
	],
	fallback: {
		module: "Game Module",
		code: "GAME_INTERNAL_ERROR",
		message: "Unexpected Games Service error"
	}
});

describeDomainToHttpMapper({
	name: "Games",
	mapper: gamesDomainToHttpMapper,
	cases: [
		{ code: "GAME_NOT_FOUND", status: 404 },
		{ code: "GAME_PLATFORM_NOT_FOUND", status: 404 },
		{ code: "GAME_SCORE_SOURCE_NOT_FOUND", status: 422 },
		{ code: "GAME_GENRE_NOT_FOUND", status: 404 },
		{ code: "GAME_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "GAME_VALIDATION_ERROR", status: 400 },
		{ code: "GAME_FORBIDDEN", status: 403 },
		{ code: "GAME_VARIANT_REQUIRED", status: 422 },
		{ code: "GAME_SPLIT_INVALID", status: 400 },
		{ code: "GAME_COMPILATION_INVALID", status: 400 },
		{ code: "GAME_IN_USE", status: 409 }
	]
});
