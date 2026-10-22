import { coopRunsDomainToHttpMapper } from "../../src/coop-runs/errors/coop-runs.domain-to-http.mapper";
import { coopRunsErrorDomainNormalizer } from "../../src/coop-runs/errors/coop-runs.error-domain.normalizer";
import { coopRunsServiceToDomainMapper } from "../../src/coop-runs/errors/coop-runs.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "CoopRuns",
	service: "CoopRuns Service",
	mapper: coopRunsServiceToDomainMapper,
	normalizer: coopRunsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "COOP_BACKLOG_NOT_FOUND",
			module: "CoopRuns Module",
			code: "COOP_BACKLOG_NOT_FOUND",
			message: "Backlog not found"
		},
		{
			serviceCode: "COOP_FORBIDDEN",
			module: "CoopRuns Module",
			code: "COOP_FORBIDDEN",
			message: "Not allowed to modify co-op on this backlog"
		},
		{
			serviceCode: "COOP_TARGET_USER_NOT_FOUND",
			module: "CoopRuns Module",
			code: "COOP_TARGET_USER_NOT_FOUND",
			message: "Target user does not exist"
		},
		{
			serviceCode: "COOP_TARGET_NOT_FOLLOWED",
			module: "CoopRuns Module",
			code: "COOP_TARGET_NOT_FOLLOWED",
			message: "You can only tag users you follow"
		},
		{
			serviceCode: "COOP_SELF_TAG",
			module: "CoopRuns Module",
			code: "COOP_SELF_TAG",
			message: "You cannot tag yourself"
		},
		{
			serviceCode: "COOP_ALREADY_TAGGED",
			module: "CoopRuns Module",
			code: "COOP_ALREADY_TAGGED",
			message: "User is already part of this run"
		},
		{
			serviceCode: "COOP_MEMBER_NOT_FOUND",
			module: "CoopRuns Module",
			code: "COOP_MEMBER_NOT_FOUND",
			message: "User is not part of this run"
		},
		{
			serviceCode: "COOP_SOURCE_NOT_IN_RUN",
			module: "CoopRuns Module",
			code: "COOP_SOURCE_NOT_IN_RUN",
			message: "Source backlog is not part of this run"
		}
	],
	fallback: {
		module: "CoopRuns Module",
		code: "COOP_INTERNAL_ERROR",
		message: "Unexpected CoopRuns Service error"
	}
});

describeDomainToHttpMapper({
	name: "CoopRuns",
	mapper: coopRunsDomainToHttpMapper,
	cases: [
		{ code: "COOP_BACKLOG_NOT_FOUND", status: 404 },
		{ code: "COOP_TARGET_USER_NOT_FOUND", status: 404 },
		{ code: "COOP_MEMBER_NOT_FOUND", status: 404 },
		{ code: "COOP_SOURCE_NOT_IN_RUN", status: 404 },
		{ code: "COOP_FORBIDDEN", status: 403 },
		{ code: "COOP_TARGET_NOT_FOLLOWED", status: 422 },
		{ code: "COOP_SELF_TAG", status: 422 },
		{ code: "COOP_ALREADY_TAGGED", status: 422 }
	]
});
