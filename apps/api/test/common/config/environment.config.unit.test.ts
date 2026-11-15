import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DatabaseConfigSchema } from "../../../src/common/config/database.config";
import {
	EnvironmentConfigSchema,
	MIN_PRODUCTION_ACCESS_TOKEN_SECRET_LENGTH
} from "../../../src/common/config/environment.config";

const STRONG_SECRET = "s".repeat(MIN_PRODUCTION_ACCESS_TOKEN_SECRET_LENGTH);

const validProductionEnvironment = {
	NODE_ENV: "prod",
	ACCESS_TOKEN_SECRET: STRONG_SECRET,
	COOKIE_SECURE: "true"
};

function failedPaths(result: {
	success: boolean;
	error?: { issues: { path: PropertyKey[] }[] };
}) {
	return result.error?.issues.map(issue => issue.path.join(".")) ?? [];
}

void describe("EnvironmentConfigSchema", () => {
	void it("keeps the local defaults in dev", () => {
		const config = EnvironmentConfigSchema.parse({ NODE_ENV: "dev" });

		assert.equal(config.ACCESS_TOKEN_SECRET, "secret-token");
		assert.equal(config.COOKIE_SECURE, false);
	});

	void it("keeps the local defaults in test", () => {
		const config = EnvironmentConfigSchema.parse({ NODE_ENV: "test" });

		assert.equal(config.ACCESS_TOKEN_SECRET, "secret-token");
		assert.equal(config.COOKIE_SECURE, false);
	});

	void it("defaults to dev when NODE_ENV is missing", () => {
		const config = EnvironmentConfigSchema.parse({});

		assert.equal(config.NODE_ENV, "dev");
	});

	void it("accepts a strong secret and secure cookies in prod", () => {
		const config = EnvironmentConfigSchema.parse(
			validProductionEnvironment
		);

		assert.equal(config.ACCESS_TOKEN_SECRET, STRONG_SECRET);
		assert.equal(config.COOKIE_SECURE, true);
	});

	void it("rejects a missing access token secret in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			ACCESS_TOKEN_SECRET: undefined
		});

		assert.deepEqual(failedPaths(result), ["ACCESS_TOKEN_SECRET"]);
	});

	void it("rejects an empty access token secret in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			ACCESS_TOKEN_SECRET: ""
		});

		assert.deepEqual(failedPaths(result), ["ACCESS_TOKEN_SECRET"]);
	});

	void it("rejects the development secret in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			ACCESS_TOKEN_SECRET: "secret-token"
		});

		assert.deepEqual(failedPaths(result), ["ACCESS_TOKEN_SECRET"]);
	});

	void it("rejects a secret one character short of the minimum in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			ACCESS_TOKEN_SECRET: STRONG_SECRET.slice(1)
		});

		assert.deepEqual(failedPaths(result), ["ACCESS_TOKEN_SECRET"]);
	});

	void it("rejects a missing COOKIE_SECURE in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			COOKIE_SECURE: undefined
		});

		assert.deepEqual(failedPaths(result), ["COOKIE_SECURE"]);
	});

	void it("rejects COOKIE_SECURE=false in prod", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			COOKIE_SECURE: "false"
		});

		assert.deepEqual(failedPaths(result), ["COOKIE_SECURE"]);
	});

	void it("rejects garbage COOKIE_SECURE values", () => {
		const result = EnvironmentConfigSchema.safeParse({
			...validProductionEnvironment,
			COOKIE_SECURE: "maybe"
		});

		assert.equal(result.success, false);
	});

	void it("reports every production problem at once", () => {
		const result = EnvironmentConfigSchema.safeParse({ NODE_ENV: "prod" });

		assert.deepEqual(failedPaths(result), [
			"ACCESS_TOKEN_SECRET",
			"COOKIE_SECURE"
		]);
	});
});

void describe("DatabaseConfigSchema", () => {
	void it("keeps the local password default in dev and test", () => {
		assert.equal(
			DatabaseConfigSchema.parse({ NODE_ENV: "dev" }).PG_PASSWORD,
			"toor"
		);
		assert.equal(
			DatabaseConfigSchema.parse({ NODE_ENV: "test" }).PG_PASSWORD,
			"toor"
		);
	});

	void it("accepts an explicit password in prod", () => {
		const config = DatabaseConfigSchema.parse({
			NODE_ENV: "prod",
			PG_PASSWORD: "a-real-password"
		});

		assert.equal(config.PG_PASSWORD, "a-real-password");
	});

	void it("rejects a missing, empty or default password in prod", () => {
		for (const PG_PASSWORD of [undefined, "", "toor"]) {
			const result = DatabaseConfigSchema.safeParse({
				NODE_ENV: "prod",
				PG_PASSWORD
			});

			assert.deepEqual(failedPaths(result), ["PG_PASSWORD"]);
		}
	});
});
