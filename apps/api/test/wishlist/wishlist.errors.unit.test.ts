import { wishlistDomainToHttpMapper } from "../../src/wishlist/errors/wishlist.domain-to-http.mapper";
import { wishlistErrorDomainNormalizer } from "../../src/wishlist/errors/wishlist.error-domain.normalizer";
import { wishlistServiceToDomainMapper } from "../../src/wishlist/errors/wishlist.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Wishlist",
	service: "Wishlist Service",
	mapper: wishlistServiceToDomainMapper,
	normalizer: wishlistErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "WISHLIST_LIMIT_REACHED",
			module: "Wishlist Module",
			code: "WISHLIST_LIMIT_REACHED",
			message: "Wishlist limit reached for free plan"
		},
		{
			serviceCode: "WISHLIST_GAMES_NOT_FOUND",
			module: "Wishlist Module",
			code: "WISHLIST_GAMES_NOT_FOUND",
			message: "One or more games not found"
		},
		{
			serviceCode: "WISHLIST_ALREADY_EXISTS",
			module: "Wishlist Module",
			code: "WISHLIST_ALREADY_EXISTS",
			message: "Game is already in your wishlist"
		},
		{
			serviceCode: "WISHLIST_NOT_FOUND",
			module: "Wishlist Module",
			code: "WISHLIST_NOT_FOUND",
			message: "Wishlist entry not found"
		},
		{
			serviceCode: "WISHLIST_PLATFORM_NOT_FOUND",
			module: "Wishlist Module",
			code: "WISHLIST_PLATFORM_NOT_FOUND",
			message: "Platform not found"
		}
	],
	fallback: {
		module: "Wishlist Module",
		code: "WISHLIST_INTERNAL_ERROR",
		message: "Unexpected Wishlist Service error"
	}
});

describeDomainToHttpMapper({
	name: "Wishlist",
	mapper: wishlistDomainToHttpMapper,
	cases: [
		{ code: "WISHLIST_LIMIT_REACHED", status: 402 },
		{ code: "WISHLIST_GAMES_NOT_FOUND", status: 404 },
		{ code: "WISHLIST_ALREADY_EXISTS", status: 409 },
		{ code: "WISHLIST_NOT_FOUND", status: 404 },
		{ code: "WISHLIST_PLATFORM_NOT_FOUND", status: 404 }
	]
});
