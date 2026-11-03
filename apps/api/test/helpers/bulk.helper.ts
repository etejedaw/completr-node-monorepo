import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it } from "node:test";

import { api } from "./app.helper";
import { createUserWithSession } from "./auth.helper";

export interface BulkSkipped {
	id: string;
	code: string;
}

export interface BulkResponseData {
	action: string;
	succeeded: string[];
	skipped: BulkSkipped[];
	queueRemoved?: string[];
}

export function postBulk(
	path: string,
	authorization: string,
	action: string | undefined,
	body: unknown
) {
	const request = api().post(path).set("Authorization", authorization);
	return (action === undefined ? request : request.query({ action })).send(
		body as object
	);
}

export function randomIds(count: number) {
	return Array.from({ length: count }, () => randomUUID());
}

export function skippedIds(skipped: BulkSkipped[]) {
	return skipped.map(item => item.id).sort();
}

interface SchemaRejectionOptions {
	path: string;
	action: string;
	idsKey: string;
	extraBody?: Record<string, unknown>;
	otherActionBody: Record<string, unknown>;
}

function assertSchemaInvalid(response: { status: number; body: unknown }) {
	assert.equal(response.status, 422);
	assert.equal(
		(response.body as { type: string }).type,
		"COMMON_SCHEMA_INVALID"
	);
}

export function itRejectsInvalidBulkRequests(options: SchemaRejectionOptions) {
	const { path, action, idsKey, extraBody = {}, otherActionBody } = options;

	async function send(queryAction: string | undefined, body: unknown) {
		const owner = await createUserWithSession();
		return postBulk(path, owner.authorization, queryAction, body);
	}

	void it("rejects an empty id list with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(await send(action, { [idsKey]: [], ...extraBody }));
	});

	void it("rejects more than 100 ids with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(
			await send(action, { [idsKey]: randomIds(101), ...extraBody })
		);
	});

	void it("accepts exactly 100 ids", async () => {
		const response = await send(action, {
			[idsKey]: randomIds(100),
			...extraBody
		});
		assert.equal(response.status, 200);
		assert.equal(response.body.data.skipped.length, 100);
	});

	void it("rejects ids that are not UUIDs with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(
			await send(action, {
				[idsKey]: [randomUUID(), "not-a-uuid"],
				...extraBody
			})
		);
	});

	void it("rejects an unknown action with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(
			await send("explode", { [idsKey]: randomIds(1), ...extraBody })
		);
	});

	void it("rejects a missing action with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(
			await send(undefined, { [idsKey]: randomIds(1), ...extraBody })
		);
	});

	void it("rejects the body of another action with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(await send(action, otherActionBody));
	});

	void it("rejects an extra field with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(
			await send(action, {
				[idsKey]: randomIds(1),
				...extraBody,
				force: true
			})
		);
	});

	void it("rejects a missing body with 422 COMMON_SCHEMA_INVALID", async () => {
		assertSchemaInvalid(await send(action, undefined));
	});

	void it("rejects an invalid token with 401", async () => {
		const response = await postBulk(path, "Bearer invalid", action, {
			[idsKey]: randomIds(1),
			...extraBody
		});
		assert.equal(response.status, 401);
	});
}
