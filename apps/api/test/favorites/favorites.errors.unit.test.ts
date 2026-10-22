import { favoritesDomainToHttpMapper } from "../../src/favorites/errors/favorites.domain-to-http.mapper";
import { favoritesErrorDomainNormalizer } from "../../src/favorites/errors/favorites.error-domain.normalizer";
import { favoritesServiceToDomainMapper } from "../../src/favorites/errors/favorites.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Favorites",
	service: "Favorite Service",
	mapper: favoritesServiceToDomainMapper,
	normalizer: favoritesErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "FAVORITE_LIMIT_REACHED",
			module: "Favorite Module",
			code: "FAVORITE_LIMIT_REACHED",
			message: "Favorites limit reached for free plan"
		},
		{
			serviceCode: "FAVORITE_GAMES_NOT_FOUND",
			module: "Favorite Module",
			code: "FAVORITE_GAMES_NOT_FOUND",
			message: "One or more games not found"
		}
	],
	fallback: {
		module: "Favorite Module",
		code: "FAVORITE_INTERNAL_ERROR",
		message: "Unexpected Favorite Service error"
	}
});

describeDomainToHttpMapper({
	name: "Favorites",
	mapper: favoritesDomainToHttpMapper,
	cases: [
		{ code: "FAVORITE_LIMIT_REACHED", status: 402 },
		{ code: "FAVORITE_GAMES_NOT_FOUND", status: 404 }
	]
});
