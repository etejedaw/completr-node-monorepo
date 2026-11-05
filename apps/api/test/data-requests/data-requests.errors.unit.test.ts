import { dataRequestsDomainToHttpMapper } from "../../src/data-requests/errors/data-requests.domain-to-http.mapper";
import { dataRequestsErrorDomainNormalizer } from "../../src/data-requests/errors/data-requests.error-domain.normalizer";
import { dataRequestsServiceToDomainMapper } from "../../src/data-requests/errors/data-requests.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "Data requests",
	service: "Data Requests Service",
	mapper: dataRequestsServiceToDomainMapper,
	normalizer: dataRequestsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "DATA_REQUEST_NOT_FOUND",
			module: "Data Request Module",
			code: "DATA_REQUEST_NOT_FOUND",
			message: "Data request not found"
		},
		{
			serviceCode: "DATA_REQUEST_ALREADY_PENDING",
			module: "Data Request Module",
			code: "DATA_REQUEST_ALREADY_PENDING",
			message: "There is already a pending request of this type"
		},
		{
			serviceCode: "DATA_REQUEST_NOT_PENDING",
			module: "Data Request Module",
			code: "DATA_REQUEST_NOT_PENDING",
			message: "This data request has already been resolved"
		},
		{
			serviceCode: "DATA_REQUEST_VALIDATION_ERROR",
			module: "Data Request Module",
			code: "DATA_REQUEST_VALIDATION_ERROR",
			message: "Invalid data request"
		}
	],
	fallback: {
		module: "Data Request Module",
		code: "DATA_REQUEST_INTERNAL_ERROR",
		message: "Unexpected Data Requests Service error"
	}
});

describeDomainToHttpMapper({
	name: "Data requests",
	mapper: dataRequestsDomainToHttpMapper,
	cases: [
		{ code: "DATA_REQUEST_NOT_FOUND", status: 404 },
		{ code: "DATA_REQUEST_ALREADY_PENDING", status: 409 },
		{ code: "DATA_REQUEST_NOT_PENDING", status: 409 },
		{ code: "DATA_REQUEST_NOT_DOWNLOADABLE", status: 409 },
		{ code: "DATA_REQUEST_EXPIRED", status: 410 },
		{ code: "DATA_REQUEST_VALIDATION_ERROR", status: 400 }
	]
});
