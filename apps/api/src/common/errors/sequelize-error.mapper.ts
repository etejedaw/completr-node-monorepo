import {
	ForeignKeyConstraintError,
	UniqueConstraintError,
	ValidationError
} from "sequelize";

import { type SequelizeErrorMappers } from "./errors.interface";

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
	if (error instanceof ForeignKeyConstraintError && mappers.foreignKey) {
		throw mappers.foreignKey(error);
	}
	throw error;
}
