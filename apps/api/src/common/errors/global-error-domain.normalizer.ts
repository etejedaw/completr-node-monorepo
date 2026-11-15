import { ForeignKeyConstraintError } from "sequelize";

import {
	bodyParserErrorMapper,
	isBodyParserError
} from "./body-parser-error.mapper";
import * as commonDomainError from "./common.domain-error";
import { DomainError } from "./domain-error";
import { SERVICE_ERROR_NORMALIZERS } from "./error-registry";
import { ServiceError } from "./service-error";

const PARENT_ROW_DELETE_PATTERN = /^update or delete on table/;

export function globalErrorDomainNormalizer(
	error: unknown,
	correlationId: string
): DomainError {
	if (error instanceof DomainError) return error;

	if (error instanceof ServiceError)
		return globalServiceErrorMapper(error, correlationId);

	if (error instanceof ForeignKeyConstraintError)
		return foreignKeyErrorMapper(error, correlationId);

	if (isBodyParserError(error))
		return bodyParserErrorMapper(error, correlationId);

	return commonDomainError.commonInternalError({ raw: error, correlationId });
}

function globalServiceErrorMapper(
	error: ServiceError,
	correlationId: string
): DomainError {
	const normalizer = Object.hasOwn(
		SERVICE_ERROR_NORMALIZERS,
		error.serviceError.service
	)
		? SERVICE_ERROR_NORMALIZERS[error.serviceError.service]
		: undefined;
	if (normalizer) return normalizer(error, correlationId);
	return commonDomainError.commonInternalError({ raw: error, correlationId });
}

function foreignKeyErrorMapper(
	error: ForeignKeyConstraintError,
	correlationId: string
): DomainError {
	const context = { raw: error, correlationId };

	if (PARENT_ROW_DELETE_PATTERN.test(error.message))
		return commonDomainError.commonResourceInUse(context);

	return commonDomainError.commonReferenceNotFound(context);
}
