import { listFollowersDomainToHttpMapper } from "../../src/list-followers/errors/list-followers.domain-to-http.mapper";
import { listFollowersErrorDomainNormalizer } from "../../src/list-followers/errors/list-followers.error-domain.normalizer";
import { listFollowersServiceToDomainMapper } from "../../src/list-followers/errors/list-followers.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "ListFollowers",
	service: "ListFollower Service",
	mapper: listFollowersServiceToDomainMapper,
	normalizer: listFollowersErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "LIST_FOLLOWER_LIST_NOT_FOUND",
			module: "ListFollower Module",
			code: "LIST_FOLLOWER_LIST_NOT_FOUND",
			message: "List not found"
		},
		{
			serviceCode: "LIST_FOLLOWER_NOT_PUBLIC",
			module: "ListFollower Module",
			code: "LIST_FOLLOWER_NOT_PUBLIC",
			message: "Cannot follow a private list"
		},
		{
			serviceCode: "LIST_FOLLOWER_ALREADY_FOLLOWING",
			module: "ListFollower Module",
			code: "LIST_FOLLOWER_ALREADY_FOLLOWING",
			message: "You are already following this list"
		},
		{
			serviceCode: "LIST_FOLLOWER_NOT_FOLLOWING",
			module: "ListFollower Module",
			code: "LIST_FOLLOWER_NOT_FOLLOWING",
			message: "You are not following this list"
		}
	],
	fallback: {
		module: "ListFollower Module",
		code: "LIST_FOLLOWER_INTERNAL_ERROR",
		message: "Unexpected ListFollower Service error"
	}
});

describeDomainToHttpMapper({
	name: "ListFollowers",
	mapper: listFollowersDomainToHttpMapper,
	cases: [
		{ code: "LIST_FOLLOWER_LIST_NOT_FOUND", status: 404 },
		{ code: "LIST_FOLLOWER_NOT_PUBLIC", status: 403 },
		{ code: "LIST_FOLLOWER_ALREADY_FOLLOWING", status: 409 },
		{ code: "LIST_FOLLOWER_NOT_FOLLOWING", status: 404 }
	]
});
