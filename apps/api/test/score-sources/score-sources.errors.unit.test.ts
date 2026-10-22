import { scoreSourcesDomainToHttpMapper } from "../../src/score-sources/errors/score-sources.domain-to-http.mapper";
import { scoreSourcesErrorDomainNormalizer } from "../../src/score-sources/errors/score-sources.error-domain.normalizer";
import { scoreSourcesServiceToDomainMapper } from "../../src/score-sources/errors/score-sources.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "ScoreSources",
	service: "ScoreSource Service",
	mapper: scoreSourcesServiceToDomainMapper,
	normalizer: scoreSourcesErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "SCORE_SOURCE_UNIQUE_CONSTRAINT",
			module: "ScoreSource Module",
			code: "SCORE_SOURCE_ALREADY_EXISTS",
			message: "A score source with this code already exists"
		}
	],
	fallback: {
		module: "ScoreSource Module",
		code: "SCORE_SOURCE_INTERNAL_ERROR",
		message: "Unexpected ScoreSource Service error"
	}
});

describeDomainToHttpMapper({
	name: "ScoreSources",
	mapper: scoreSourcesDomainToHttpMapper,
	cases: [{ code: "SCORE_SOURCE_ALREADY_EXISTS", status: 409 }]
});
