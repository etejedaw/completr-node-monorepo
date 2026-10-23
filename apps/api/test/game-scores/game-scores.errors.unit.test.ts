import { gameScoresDomainToHttpMapper } from "../../src/game-scores/errors/game-scores.domain-to-http.mapper";
import { gameScoresErrorDomainNormalizer } from "../../src/game-scores/errors/game-scores.error-domain.normalizer";
import { gameScoresServiceToDomainMapper } from "../../src/game-scores/errors/game-scores.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "GameScores",
	service: "GameScore Service",
	mapper: gameScoresServiceToDomainMapper,
	normalizer: gameScoresErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_SCORE_NOT_FOUND",
			module: "GameScore Module",
			code: "GAME_SCORE_NOT_FOUND",
			message: "Game score not found"
		},
		{
			serviceCode: "GAME_SCORE_UNKNOWN_SOURCE",
			module: "GameScore Module",
			code: "GAME_SCORE_SOURCE_NOT_FOUND",
			message: "Score source does not exist in the catalog"
		},
		{
			serviceCode: "GAME_SCORE_OUT_OF_RANGE",
			module: "GameScore Module",
			code: "GAME_SCORE_OUT_OF_RANGE",
			message: "Score is outside the scale of its source"
		},
		{
			serviceCode: "GAME_SCORE_GAME_NOT_FOUND",
			module: "GameScore Module",
			code: "GAME_SCORE_GAME_NOT_FOUND",
			message: "Game does not exist"
		},
		{
			serviceCode: "GAME_SCORE_UNIQUE_CONSTRAINT",
			module: "GameScore Module",
			code: "GAME_SCORE_ALREADY_EXISTS",
			message: "A score for this game and source already exists"
		}
	],
	fallback: {
		module: "GameScore Module",
		code: "GAME_SCORE_INTERNAL_ERROR",
		message: "Unexpected GameScore Service error"
	}
});

describeDomainToHttpMapper({
	name: "GameScores",
	mapper: gameScoresDomainToHttpMapper,
	cases: [
		{ code: "GAME_SCORE_NOT_FOUND", status: 404 },
		{ code: "GAME_SCORE_GAME_NOT_FOUND", status: 404 },
		{ code: "GAME_SCORE_SOURCE_NOT_FOUND", status: 422 },
		{ code: "GAME_SCORE_OUT_OF_RANGE", status: 422 },
		{ code: "GAME_SCORE_ALREADY_EXISTS", status: 409 }
	]
});
