import { userFollowRequestsDomainToHttpMapper } from "../../src/user-follow-requests/errors/user-follow-requests.domain-to-http.mapper";
import { userFollowRequestsErrorDomainNormalizer } from "../../src/user-follow-requests/errors/user-follow-requests.error-domain.normalizer";
import { userFollowRequestsServiceToDomainMapper } from "../../src/user-follow-requests/errors/user-follow-requests.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "UserFollowRequests",
	service: "UserFollowRequest Service",
	mapper: userFollowRequestsServiceToDomainMapper,
	normalizer: userFollowRequestsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "USER_FOLLOW_REQUEST_USER_NOT_FOUND",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_USER_NOT_FOUND",
			message: "User not found"
		},
		{
			serviceCode: "USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF",
			message: "You cannot send a follow request to yourself"
		},
		{
			serviceCode: "USER_FOLLOW_REQUEST_ALREADY_REQUESTED",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_ALREADY_REQUESTED",
			message: "You already requested to follow this user"
		},
		{
			serviceCode: "USER_FOLLOW_REQUEST_ALREADY_FOLLOWING",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_ALREADY_FOLLOWING",
			message: "You are already following this user"
		},
		{
			serviceCode: "USER_FOLLOW_REQUEST_NOT_FOUND",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_NOT_FOUND",
			message: "Follow request not found"
		},
		{
			serviceCode: "USER_FOLLOW_REQUEST_NOT_ACCEPTING",
			module: "UserFollowRequest Module",
			code: "USER_FOLLOW_REQUEST_NOT_ACCEPTING",
			message: "This user is not accepting follow requests"
		}
	],
	fallback: {
		module: "UserFollowRequest Module",
		code: "USER_FOLLOW_REQUEST_INTERNAL_ERROR",
		message: "Unexpected UserFollowRequest Service error"
	}
});

describeDomainToHttpMapper({
	name: "UserFollowRequests",
	mapper: userFollowRequestsDomainToHttpMapper,
	cases: [
		{ code: "USER_FOLLOW_REQUEST_USER_NOT_FOUND", status: 404 },
		{ code: "USER_FOLLOW_REQUEST_CANNOT_REQUEST_SELF", status: 400 },
		{ code: "USER_FOLLOW_REQUEST_ALREADY_REQUESTED", status: 409 },
		{ code: "USER_FOLLOW_REQUEST_ALREADY_FOLLOWING", status: 409 },
		{ code: "USER_FOLLOW_REQUEST_NOT_FOUND", status: 404 },
		{ code: "USER_FOLLOW_REQUEST_NOT_ACCEPTING", status: 403 }
	]
});
