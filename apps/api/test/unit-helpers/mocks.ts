import { mock } from "node:test";

import { type RequestUser } from "../../src/common/interfaces/request-user.interface";
import { sequelize } from "../../src/database/sequelize.database";

export interface StubbedFunction {
	mock: {
		calls: { arguments: unknown[] }[];
		callCount(): number;
	};
}

export function stub<T extends object>(
	target: T,
	method: keyof T & string,
	implementation: (...args: never[]) => unknown
) {
	return mock.method(
		target,
		method as never,
		implementation as never
	) as unknown as StubbedFunction;
}

export function spy() {
	return mock.fn(async (..._args: unknown[]) => undefined);
}

export function stubTransaction() {
	const transaction = { id: "tx" };
	return {
		transaction,
		mocked: stub(
			sequelize,
			"transaction",
			async (callback: (t: object) => unknown) => callback(transaction)
		)
	};
}

export function buildRequestUser(
	overrides: Partial<RequestUser> = {}
): RequestUser {
	return {
		id: "user-1",
		username: "player",
		email: "player@example.com",
		role: "user",
		isActive: true,
		...overrides
	};
}

export async function captureRejection(promise: Promise<unknown>) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	return undefined;
}
