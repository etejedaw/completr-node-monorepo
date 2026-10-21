import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import { bearer, login, type Session } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { createUser } from "../helpers/factories.helper";

const SESSIONS_PATH = "/auth/sessions";

useTestDatabase();

async function createUserWithSessions(count: number) {
	const user = await createUser();
	const sessions: Session[] = [];
	for (let index = 0; index < count; index++) {
		sessions.push(await login(user.email));
	}
	return { user, sessions };
}

function refreshStatus(session: Session) {
	return api()
		.post("/auth/refresh")
		.send({ refresh_token: session.refreshToken })
		.then(response => response.status);
}

async function sessionIds(session: Session) {
	const response = await api()
		.get(SESSIONS_PATH)
		.set("Authorization", bearer(session.accessToken))
		.expect(200);
	return new Set(
		(response.body.data.sessions as { id: string }[]).map(entry => entry.id)
	);
}

void describe("GET /auth/sessions", () => {
	void it("lists only the caller's sessions with their device", async () => {
		const { sessions } = await createUserWithSessions(2);
		await createUserWithSessions(1);

		const response = await api()
			.get(SESSIONS_PATH)
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, 2);
		assert.deepEqual(
			new Set(
				response.body.data.sessions.map(
					(entry: { id: string }) => entry.id
				)
			),
			new Set(sessions.map(session => session.sessionId))
		);
		for (const entry of response.body.data.sessions) {
			assert.equal(typeof entry.deviceInfo, "string");
			assert.ok(entry.expiresAt);
			assert.equal("tokenHash" in entry, false);
		}
	});

	void it("paginates keeping the full total", async () => {
		const { sessions } = await createUserWithSessions(3);

		const response = await api()
			.get(SESSIONS_PATH)
			.query({ limit: 2 })
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 200);
		assert.equal(response.body.data.sessions.length, 2);
		assert.equal(response.body.data.total, 3);
	});

	void it("rejects an invalid token with 401 AUTH_INVALID_TOKEN", async () => {
		const response = await api()
			.get(SESSIONS_PATH)
			.set("Authorization", "Bearer invalid");

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_TOKEN");
	});

	void it("rejects a missing Authorization header with 422 AUTH_SCHEMA_INVALID", async () => {
		const response = await api().get(SESSIONS_PATH);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "AUTH_SCHEMA_INVALID");
	});
});

void describe("DELETE /auth/sessions/:sessionId", () => {
	void it("revokes one of the caller's sessions", async () => {
		const { sessions } = await createUserWithSessions(2);
		const [current, other] = sessions;

		const response = await api()
			.delete(`${SESSIONS_PATH}/${other!.sessionId}`)
			.set("Authorization", bearer(current!.accessToken));

		assert.equal(response.status, 204);
		assert.deepEqual(
			await sessionIds(current!),
			new Set([current!.sessionId])
		);
		assert.equal(await refreshStatus(other!), 401);
		assert.equal(await refreshStatus(current!), 200);
	});

	void it("does not revoke another user's session and answers 401 AUTH_INVALID_REFRESH_TOKEN", async () => {
		const owner = await createUserWithSessions(1);
		const intruder = await createUserWithSessions(1);
		const target = owner.sessions[0]!;

		const response = await api()
			.delete(`${SESSIONS_PATH}/${target.sessionId}`)
			.set("Authorization", bearer(intruder.sessions[0]!.accessToken));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
		assert.equal(await refreshStatus(target), 200);
	});

	void it("answers 401 AUTH_INVALID_REFRESH_TOKEN for an unknown session", async () => {
		const { sessions } = await createUserWithSessions(1);

		const response = await api()
			.delete(`${SESSIONS_PATH}/${randomUUID()}`)
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
	});

	void it("rejects a malformed session id with 422 COMMON_SCHEMA_INVALID", async () => {
		const { sessions } = await createUserWithSessions(1);

		const response = await api()
			.delete(`${SESSIONS_PATH}/not-a-uuid`)
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});

void describe("DELETE /auth/sessions/others/:sessionId", () => {
	void it("revokes every session but the given one", async () => {
		const { sessions } = await createUserWithSessions(3);
		const [current, ...others] = sessions;
		const bystander = await createUserWithSessions(1);

		const response = await api()
			.delete(`${SESSIONS_PATH}/others/${current!.sessionId}`)
			.set("Authorization", bearer(current!.accessToken));

		assert.equal(response.status, 200);
		assert.equal(response.body.data.revoked, 2);
		assert.deepEqual(
			await sessionIds(current!),
			new Set([current!.sessionId])
		);
		for (const session of others) {
			assert.equal(await refreshStatus(session), 401);
		}
		assert.equal(await refreshStatus(bystander.sessions[0]!), 200);
	});

	void it("revokes nothing when the caller has a single session", async () => {
		const { sessions } = await createUserWithSessions(1);

		const response = await api()
			.delete(`${SESSIONS_PATH}/others/${sessions[0]!.sessionId}`)
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 200);
		assert.equal(response.body.data.revoked, 0);
	});

	void it("rejects a malformed session id with 422 COMMON_SCHEMA_INVALID", async () => {
		const { sessions } = await createUserWithSessions(1);

		const response = await api()
			.delete(`${SESSIONS_PATH}/others/not-a-uuid`)
			.set("Authorization", bearer(sessions[0]!.accessToken));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});
});
