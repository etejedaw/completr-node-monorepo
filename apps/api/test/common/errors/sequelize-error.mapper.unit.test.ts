/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	ForeignKeyConstraintError,
	UniqueConstraintError,
	ValidationError
} from "sequelize";

import { rethrowSequelizeError } from "../../../src/common/errors/sequelize-error.mapper";
import { ServiceError } from "../../../src/common/errors/service-error";

function mapperFor(code: string) {
	return (raw: unknown) => new ServiceError(code, { service: "Test", raw });
}

const mappers = {
	unique: mapperFor("UNIQUE"),
	validation: mapperFor("VALIDATION"),
	foreignKey: mapperFor("FOREIGN_KEY")
};

describe("rethrowSequelizeError", () => {
	it("maps a unique constraint error with the unique mapper", () => {
		const raw = new UniqueConstraintError({});

		assert.throws(
			() => rethrowSequelizeError(raw, mappers),
			(error: ServiceError) =>
				error.code === "UNIQUE" && error.serviceError.raw === raw
		);
	});

	it("maps a validation error with the validation mapper", () => {
		assert.throws(
			() =>
				rethrowSequelizeError(new ValidationError("bad", []), mappers),
			{ code: "VALIDATION" }
		);
	});

	it("maps a foreign key error with the foreignKey mapper", () => {
		assert.throws(
			() =>
				rethrowSequelizeError(
					new ForeignKeyConstraintError({}),
					mappers
				),
			{ code: "FOREIGN_KEY" }
		);
	});

	it("prefers the unique mapper because UniqueConstraintError extends ValidationError", () => {
		assert.throws(
			() =>
				rethrowSequelizeError(new UniqueConstraintError({}), {
					validation: mappers.validation,
					unique: mappers.unique
				}),
			{ code: "UNIQUE" }
		);
	});

	it("rethrows the original error when the matching mapper is missing", () => {
		const raw = new ForeignKeyConstraintError({});

		assert.throws(
			() => rethrowSequelizeError(raw, { unique: mappers.unique }),
			error => error === raw
		);
	});

	it("rethrows unrelated errors untouched", () => {
		const raw = new Error("boom");

		assert.throws(
			() => rethrowSequelizeError(raw, mappers),
			error => error === raw
		);
	});
});
