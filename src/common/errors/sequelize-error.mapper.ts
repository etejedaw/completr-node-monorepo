import { UniqueConstraintError, ValidationError } from "sequelize";

import { ServiceError } from "./service-error";

export interface SequelizeErrorMappers {
	unique?: (rawError: unknown) => ServiceError;
	validation?: (rawError: unknown) => ServiceError;
}

export function rethrowSequelizeError(
	error: unknown,
	mappers: SequelizeErrorMappers
): never {
	if (error instanceof UniqueConstraintError && mappers.unique) {
		throw mappers.unique(error);
	}
	if (error instanceof ValidationError && mappers.validation) {
		throw mappers.validation(error);
	}
	throw error;
}
