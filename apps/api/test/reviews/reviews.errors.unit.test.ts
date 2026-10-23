import { reviewsDomainToHttpMapper } from "../../src/reviews/errors/reviews.domain-to-http.mapper";
import { reviewsErrorDomainNormalizer } from "../../src/reviews/errors/reviews.error-domain.normalizer";
import { reviewsServiceToDomainMapper } from "../../src/reviews/errors/reviews.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Reviews",
	service: "Review Service",
	mapper: reviewsServiceToDomainMapper,
	normalizer: reviewsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "REVIEW_NOT_FOUND",
			module: "Review Module",
			code: "REVIEW_NOT_FOUND",
			message: "Review not found"
		},
		{
			serviceCode: "REVIEW_FORBIDDEN",
			module: "Review Module",
			code: "REVIEW_FORBIDDEN",
			message: "Cannot modify another user's review"
		},
		{
			serviceCode: "REVIEW_ALREADY_EXISTS",
			module: "Review Module",
			code: "REVIEW_ALREADY_EXISTS",
			message: "You already reviewed this game"
		},
		{
			serviceCode: "REVIEW_GAME_NOT_FOUND",
			module: "Review Module",
			code: "REVIEW_GAME_NOT_FOUND",
			message: "Game not found"
		}
	],
	fallback: {
		module: "Review Module",
		code: "REVIEW_INTERNAL_ERROR",
		message: "Unexpected Review Service error"
	}
});

describeDomainToHttpMapper({
	name: "Reviews",
	mapper: reviewsDomainToHttpMapper,
	cases: [
		{ code: "REVIEW_NOT_FOUND", status: 404 },
		{ code: "REVIEW_FORBIDDEN", status: 403 },
		{ code: "REVIEW_ALREADY_EXISTS", status: 409 },
		{ code: "REVIEW_GAME_NOT_FOUND", status: 404 }
	]
});
