import { userFollowersDomainToHttpMapper } from "../../src/user-followers/errors/user-followers.domain-to-http.mapper";
import { userFollowersErrorDomainNormalizer } from "../../src/user-followers/errors/user-followers.error-domain.normalizer";
import { userFollowersServiceToDomainMapper } from "../../src/user-followers/errors/user-followers.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "UserFollowers",
	service: "UserFollower Service",
	mapper: userFollowersServiceToDomainMapper,
	normalizer: userFollowersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "USER_FOLLOWER_USER_NOT_FOUND",
			module: "UserFollower Module",
			code: "USER_FOLLOWER_USER_NOT_FOUND",
			message: "User not found"
		},
		{
			serviceCode: "USER_FOLLOWER_NOT_FOLLOWING",
			module: "UserFollower Module",
			code: "USER_FOLLOWER_NOT_FOLLOWING",
			message: "You are not following this user"
		}
	],
	fallback: {
		module: "UserFollower Module",
		code: "USER_FOLLOWER_INTERNAL_ERROR",
		message: "Unexpected UserFollower Service error"
	}
});

describeDomainToHttpMapper({
	name: "UserFollowers",
	mapper: userFollowersDomainToHttpMapper,
	cases: [
		{ code: "USER_FOLLOWER_USER_NOT_FOUND", status: 404 },
		{ code: "USER_FOLLOWER_NOT_FOLLOWING", status: 404 }
	]
});
