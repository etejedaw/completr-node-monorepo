import { userFollowersDomainToHttpMapper } from "../../src/user-followers/errors/user-followers.domain-to-http.mapper";
import { userFollowersErrorDomainNormalizer } from "../../src/user-followers/errors/user-followers.error-domain.normalizer";
import { userFollowersServiceToDomainMapper } from "../../src/user-followers/errors/user-followers.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "UserFollowers write errors",
	service: "UserFollower Service",
	mapper: userFollowersServiceToDomainMapper,
	normalizer: userFollowersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "USER_FOLLOWER_ALREADY_FOLLOWING",
			module: "UserFollower Module",
			code: "USER_FOLLOWER_ALREADY_FOLLOWING",
			message: "You are already following this user"
		},
		{
			serviceCode: "USER_FOLLOWER_VALIDATION_ERROR",
			module: "UserFollower Module",
			code: "USER_FOLLOWER_VALIDATION_ERROR",
			message: "The follow is not valid"
		}
	],
	fallback: {
		module: "UserFollower Module",
		code: "USER_FOLLOWER_INTERNAL_ERROR",
		message: "Unexpected UserFollower Service error"
	}
});

describeDomainToHttpMapper({
	name: "UserFollowers write errors",
	mapper: userFollowersDomainToHttpMapper,
	cases: [
		{ code: "USER_FOLLOWER_ALREADY_FOLLOWING", status: 409 },
		{ code: "USER_FOLLOWER_VALIDATION_ERROR", status: 422 }
	]
});
