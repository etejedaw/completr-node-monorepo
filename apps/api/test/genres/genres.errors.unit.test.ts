import { genresDomainToHttpMapper } from "../../src/genres/errors/genres.domain-to-http.mapper";
import { genresErrorDomainNormalizer } from "../../src/genres/errors/genres.error-domain.normalizer";
import { genresServiceToDomainMapper } from "../../src/genres/errors/genres.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Genres",
	service: "Genre Service",
	mapper: genresServiceToDomainMapper,
	normalizer: genresErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "GENRE_NOT_FOUND",
			module: "Genre Module",
			code: "GENRE_NOT_FOUND",
			message: "Genre not found"
		},
		{
			serviceCode: "GENRE_UNIQUE_CONSTRAINT",
			module: "Genre Module",
			code: "GENRE_UNIQUE_CONSTRAINT",
			message: "Genre already exists"
		},
		{
			serviceCode: "GENRE_VALIDATION_ERROR",
			module: "Genre Module",
			code: "GENRE_VALIDATION_ERROR",
			message: "Genre validation failed"
		},
		{
			serviceCode: "GENRE_IN_USE",
			module: "Genre Module",
			code: "GENRE_IN_USE",
			message: "Genre is in use and cannot be deleted"
		}
	],
	fallback: {
		module: "Genre Module",
		code: "GENRE_INTERNAL_ERROR",
		message: "Unexpected Genre Service error"
	}
});

describeDomainToHttpMapper({
	name: "Genres",
	mapper: genresDomainToHttpMapper,
	cases: [
		{ code: "GENRE_NOT_FOUND", status: 404 },
		{ code: "GENRE_UNIQUE_CONSTRAINT", status: 409 },
		{ code: "GENRE_VALIDATION_ERROR", status: 400 },
		{ code: "GENRE_IN_USE", status: 409 }
	]
});
