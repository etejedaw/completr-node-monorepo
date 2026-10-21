import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { api } from "../helpers/app.helper";
import {
	bearer,
	createUserWithSession,
	extractRefreshCookie,
	refreshTokenFromCookie
} from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { DEFAULT_PASSWORD } from "../helpers/factories.helper";
import {
	clearOutbox,
	extractTokenFromMail,
	waitForMailTo
} from "../helpers/mail.helper";

const EMAIL = "journey@completr.test";
const CHANGED_PASSWORD = "Ch4ngedPass!";
const RESET_PASSWORD = "R3setPassw0rd!";
const LAPTOP = "Completr Laptop";
const PHONE = "Completr Phone";
const TABLET = "Completr Tablet";

useTestDatabase();

interface DeviceSession {
	authorization: string;
	sessionId: string;
	refreshToken: string;
}

interface SessionView {
	id: string;
	deviceInfo: string;
}

function sessionFrom(response: {
	body: { data: { access_token: string; session_id: string } };
	headers: Record<string, string | string[] | undefined>;
}): DeviceSession {
	const cookie = extractRefreshCookie(response.headers["set-cookie"]);
	return {
		authorization: bearer(response.body.data.access_token),
		sessionId: response.body.data.session_id,
		refreshToken: refreshTokenFromCookie(cookie)
	};
}

function loginFrom(device: string, password: string) {
	return api()
		.post("/auth/login")
		.set("User-Agent", device)
		.send({ email: EMAIL, password });
}

async function signIn(device: string, password: string) {
	return sessionFrom(await loginFrom(device, password).expect(200));
}

function refresh(session: DeviceSession, device: string) {
	return api()
		.post("/auth/refresh")
		.set("User-Agent", device)
		.send({ refresh_token: session.refreshToken });
}

async function listSessions(session: DeviceSession) {
	const response = await api()
		.get("/auth/sessions")
		.set("Authorization", session.authorization)
		.expect(200);
	return response.body.data as { sessions: SessionView[]; total: number };
}

async function sessionDevices(session: DeviceSession) {
	const { sessions } = await listSessions(session);
	return new Set(sessions.map(entry => entry.deviceInfo));
}

void describe("account journey: invitation, devices, sessions and passwords", () => {
	let laptop: DeviceSession;
	let phone: DeviceSession;
	let tablet: DeviceSession;
	let invitationToken: string;

	void it("creates the account from an invitation and starts the first session", async () => {
		clearOutbox();
		const admin = await createUserWithSession("admin");
		await api()
			.post("/admin/invitations")
			.set("Authorization", admin.authorization)
			.send({ email: EMAIL })
			.expect(201);
		invitationToken = extractTokenFromMail(await waitForMailTo(EMAIL));

		const preview = await api()
			.get(`/invitations/${invitationToken}`)
			.expect(200);
		assert.equal(preview.body.data.invitation.email, EMAIL);

		const accepted = await api()
			.post("/invitations/accept")
			.set("User-Agent", LAPTOP)
			.send({
				token: invitationToken,
				username: "journey",
				name: "Journey User",
				password: DEFAULT_PASSWORD
			});
		assert.equal(accepted.status, 201);
		laptop = sessionFrom(accepted);

		const me = await api()
			.get("/users/me")
			.set("Authorization", laptop.authorization)
			.expect(200);
		assert.equal(me.body.data.user.username, "journey");
		assert.deepEqual(await sessionDevices(laptop), new Set([LAPTOP]));
	});

	void it("consumes the invitation once the account exists", async () => {
		const reused = await api().post("/invitations/accept").send({
			token: invitationToken,
			username: "journey2",
			name: "Second Account",
			password: DEFAULT_PASSWORD
		});
		assert.equal(reused.status, 404);
		assert.equal(reused.body.type, "INVITATION_INVALID_TOKEN");

		const pending = await api()
			.get("/admin/invitations")
			.set(
				"Authorization",
				(await createUserWithSession("admin")).authorization
			)
			.expect(200);
		assert.ok(
			pending.body.data.invitations.every(
				(invitation: { email: string }) => invitation.email !== EMAIL
			)
		);
	});

	void it("signs in from two more devices and lists every session", async () => {
		phone = await signIn(PHONE, DEFAULT_PASSWORD);
		tablet = await signIn(TABLET, DEFAULT_PASSWORD);

		const { sessions, total } = await listSessions(laptop);
		assert.equal(total, 3);
		assert.deepEqual(
			new Set(sessions.map(entry => entry.id)),
			new Set([laptop.sessionId, phone.sessionId, tablet.sessionId])
		);
		assert.deepEqual(
			await sessionDevices(phone),
			new Set([LAPTOP, PHONE, TABLET])
		);
	});

	void it("revokes the phone session from the laptop", async () => {
		await api()
			.delete(`/auth/sessions/${phone.sessionId}`)
			.set("Authorization", laptop.authorization)
			.expect(204);

		assert.deepEqual(
			await sessionDevices(laptop),
			new Set([LAPTOP, TABLET])
		);
	});

	void it("rejects refreshing the revoked session and keeps the others", async () => {
		const response = await refresh(phone, PHONE);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
		assert.equal((await listSessions(laptop)).total, 2);
	});

	void it("rejects revoking a session that no longer exists", async () => {
		const response = await api()
			.delete(`/auth/sessions/${phone.sessionId}`)
			.set("Authorization", laptop.authorization);

		assert.equal(response.status, 401);
		assert.equal(response.body.type, "AUTH_INVALID_REFRESH_TOKEN");
		assert.equal((await listSessions(laptop)).total, 2);
	});

	void it("rotates the tablet session on refresh keeping its device", async () => {
		const response = await refresh(tablet, TABLET);
		assert.equal(response.status, 200);
		const rotated = sessionFrom(response);
		assert.notEqual(rotated.sessionId, tablet.sessionId);

		const stale = await refresh(tablet, TABLET);
		assert.equal(stale.status, 401);
		tablet = rotated;

		const { sessions } = await listSessions(laptop);
		assert.deepEqual(
			new Set(sessions.map(entry => entry.id)),
			new Set([laptop.sessionId, tablet.sessionId])
		);
		assert.deepEqual(
			await sessionDevices(laptop),
			new Set([LAPTOP, TABLET])
		);
	});

	void it("signs out every other device from the laptop", async () => {
		phone = await signIn(PHONE, DEFAULT_PASSWORD);

		const response = await api()
			.delete(`/auth/sessions/others/${laptop.sessionId}`)
			.set("Authorization", laptop.authorization);
		assert.equal(response.status, 200);
		assert.equal(response.body.data.revoked, 2);

		const { sessions } = await listSessions(laptop);
		assert.deepEqual(
			sessions.map(entry => entry.id),
			[laptop.sessionId]
		);
		assert.equal((await refresh(tablet, TABLET)).status, 401);
		assert.equal((await refresh(phone, PHONE)).status, 401);
	});

	void it("changes the password revoking every session", async () => {
		phone = await signIn(PHONE, DEFAULT_PASSWORD);

		await api()
			.patch("/auth/password")
			.set("Authorization", laptop.authorization)
			.send({ password: CHANGED_PASSWORD })
			.expect(204);

		assert.equal((await refresh(laptop, LAPTOP)).status, 401);
		assert.equal((await refresh(phone, PHONE)).status, 401);
		const oldPassword = await loginFrom(PHONE, DEFAULT_PASSWORD);
		assert.equal(oldPassword.status, 401);
		assert.equal(oldPassword.body.type, "AUTH_INVALID_CREDENTIALS");

		phone = await signIn(PHONE, CHANGED_PASSWORD);
		assert.deepEqual(
			(await listSessions(phone)).sessions.map(entry => entry.id),
			[phone.sessionId]
		);
	});

	void it("resets a forgotten password from the mailed link revoking every session", async () => {
		clearOutbox();
		await api()
			.post("/auth/forgot-password")
			.send({ email: EMAIL })
			.expect(204);
		const token = extractTokenFromMail(await waitForMailTo(EMAIL));

		await api()
			.post("/auth/reset-password")
			.send({ token, password: RESET_PASSWORD })
			.expect(204);

		assert.equal((await refresh(phone, PHONE)).status, 401);
		assert.equal((await loginFrom(LAPTOP, CHANGED_PASSWORD)).status, 401);
		laptop = await signIn(LAPTOP, RESET_PASSWORD);
		assert.deepEqual(
			(await listSessions(laptop)).sessions.map(entry => entry.id),
			[laptop.sessionId]
		);

		const reused = await api()
			.post("/auth/reset-password")
			.send({ token, password: DEFAULT_PASSWORD });
		assert.equal(reused.status, 400);
		assert.equal(reused.body.type, "AUTH_INVALID_PASSWORD_RESET_TOKEN");
		await signIn(LAPTOP, RESET_PASSWORD);
	});
});
