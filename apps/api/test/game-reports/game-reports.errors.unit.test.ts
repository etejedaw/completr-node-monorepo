import { gameReportsDomainToHttpMapper } from "../../src/game-reports/errors/game-reports.domain-to-http.mapper";
import { gameReportsErrorDomainNormalizer } from "../../src/game-reports/errors/game-reports.error-domain.normalizer";
import { gameReportsServiceToDomainMapper } from "../../src/game-reports/errors/game-reports.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "GameReports",
	service: "GameReport Service",
	mapper: gameReportsServiceToDomainMapper,
	normalizer: gameReportsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GAME_REPORT_GAME_NOT_FOUND",
			module: "GameReport Module",
			code: "GAME_REPORT_GAME_NOT_FOUND",
			message: "Game not found"
		},
		{
			serviceCode: "GAME_REPORT_ALREADY_REPORTED",
			module: "GameReport Module",
			code: "GAME_REPORT_ALREADY_REPORTED",
			message: "You already have an active report for this game"
		},
		{
			serviceCode: "GAME_REPORT_NOT_FOUND",
			module: "GameReport Module",
			code: "GAME_REPORT_NOT_FOUND",
			message: "Report not found"
		}
	],
	fallback: {
		module: "GameReport Module",
		code: "GAME_REPORT_INTERNAL_ERROR",
		message: "Unexpected GameReport Service error"
	}
});

describeDomainToHttpMapper({
	name: "GameReports",
	mapper: gameReportsDomainToHttpMapper,
	cases: [
		{ code: "GAME_REPORT_GAME_NOT_FOUND", status: 404 },
		{ code: "GAME_REPORT_ALREADY_REPORTED", status: 409 },
		{ code: "GAME_REPORT_NOT_FOUND", status: 404 }
	]
});
