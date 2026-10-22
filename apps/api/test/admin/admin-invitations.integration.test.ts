import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, it, mock } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { environmentConfig } from "../../src/common/config/environment.config";
import {
	generateOneTimeToken,
	hashOneTimeToken
} from "../../src/common/utils/one-time-token.util";
import { UserInvitation } from "../../src/invitations/user-invitation.model";
import { sendError } from "../../src/mail/errors/mail.service-error";
import { InMemoryMailProvider } from "../../src/mail/mail.provider";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser, DEFAULT_PASSWORD } from "../helpers/factories.helper";
import {
	clearOutbox,
	extractTokenFromMail,
	findLastMailTo,
	waitForMailTo
} from "../helpers/mail.helper";

useTestDatabase();

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

async function createInvitation(invitedById: string | null = null) {
	const { rawToken, tokenHash } = generateOneTimeToken();
	const invitation = await UserInvitation.create({
		email: `invited_${randomUUID().replaceAll("-", "").slice(0, 10)}@completr.test`,
		tokenHash,
		invitedById,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
	});
	return { invitation, rawToken };
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

void describe("DELETE /admin/invitations/:invitationId", () => {
	void it("revokes a pending invitation so its link stops working", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await createInvitation(admin.user.id);

		await api().get(`/invitations/${rawToken}`).expect(200);

		const response = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			0
		);

		const lookup = await api().get(`/invitations/${rawToken}`);
		assert.equal(lookup.status, 404);
		assert.equal(lookup.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("stops the revoked token from creating an account", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const accept = await api().post("/invitations/accept").send({
			token: rawToken,
			username: "revoked.user",
			name: "Revoked User",
			password: "Passw0rd!"
		});
		assert.equal(accept.status, 404);
		assert.equal(accept.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("removes the invitation from the admin listing", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);
		const { invitation: kept } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const listing = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);
		const ids = (listing.body.data.invitations as { id: string }[]).map(
			entry => entry.id
		);
		assert.equal(ids.includes(invitation.id), false);
		assert.equal(ids.includes(kept.id), true);
	});

	void it("revokes an invitation that already expired", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);
		await invitation.update({ expiresAt: new Date(Date.now() - 1_000) });

		const response = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 204);
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			0
		);
	});

	void it("records the revocation in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);

		const entry = await auditEntry("invitation_revoked", invitation.id);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "invitation");
	});

	void it("answers 404 INVITATION_NOT_FOUND for an unknown invitation", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete(`/admin/invitations/${randomUUID()}`)
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_NOT_FOUND");
	});

	void it("answers 404 INVITATION_NOT_FOUND the second time the same invitation is revoked", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);

		await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization)
			.expect(204);
		const second = await api()
			.delete(`/admin/invitations/${invitation.id}`)
			.set("Authorization", admin.authorization);

		assert.equal(second.status, 404);
		assert.equal(second.body.type, "INVITATION_NOT_FOUND");
	});

	void it("rejects a malformed invitation id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.delete("/admin/invitations/not-a-uuid")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} and keeps the invitation`, async () => {
			const account = await createUserWithSession(role);
			const { invitation, rawToken } = await createInvitation();

			const response = await api()
				.delete(`/admin/invitations/${invitation.id}`)
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(
				await UserInvitation.count({
					where: { tokenHash: hashOneTimeToken(rawToken) }
				}),
				1
			);
		});
	}

	void it("hides the route from an anonymous caller and keeps the invitation", async () => {
		const { invitation } = await createInvitation();

		const response = await api().delete(
			`/admin/invitations/${invitation.id}`
		);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			1
		);
	});
});

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_MS = 60 * 1000;

interface InvitationBody {
	id: string;
	email: string;
	createdAt: string;
	expiresAt: string;
	isExpired: boolean;
}

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 10);
}

function inviteeEmail() {
	return `invitee_${uniqueSuffix()}@completr.test`;
}

function postInvitation(authorization: string, body: unknown) {
	return api()
		.post("/admin/invitations")
		.set("Authorization", authorization)
		.send(body as object);
}

function acceptPayload(token: string, overrides: Record<string, unknown> = {}) {
	return {
		token,
		username: `inv${uniqueSuffix().slice(0, 8)}`,
		name: "Invited User",
		password: DEFAULT_PASSWORD,
		...overrides
	};
}

async function inviteAndReadMail(admin: { authorization: string }) {
	const email = inviteeEmail();
	const response = await postInvitation(admin.authorization, {
		email
	}).expect(201);
	const mail = await waitForMailTo(email);
	return {
		email,
		invitation: response.body.data.invitation as InvitationBody,
		mail,
		rawToken: extractTokenFromMail(mail)
	};
}

void describe("POST /admin/invitations", () => {
	afterEach(() => {
		mock.restoreAll();
		clearOutbox();
	});

	void it("creates an invitation and answers 201 with its public fields", async () => {
		const admin = await createUserWithSession("admin");
		const email = inviteeEmail();

		const response = await postInvitation(admin.authorization, { email });

		assert.equal(response.status, 201);
		const { invitation } = response.body.data;
		assert.deepEqual(Object.keys(invitation).sort(), [
			"createdAt",
			"email",
			"expiresAt",
			"id",
			"isExpired"
		]);
		assert.equal(invitation.email, email);
		assert.equal(invitation.isExpired, false);
		assert.ok(!Number.isNaN(Date.parse(invitation.createdAt)));
	});

	void it("stores the invitation hashed, attributed to the admin and with the configured TTL", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await inviteAndReadMail(admin);

		const stored = await UserInvitation.findByPk(invitation.id);
		assert.ok(stored);
		assert.equal(stored.invitedById, admin.user.id);
		assert.equal(stored.tokenHash, hashOneTimeToken(rawToken));
		assert.notEqual(stored.tokenHash, rawToken);
		const expectedExpiry =
			Date.now() + environmentConfig.USER_INVITATION_TTL_DAYS * DAY_MS;
		assert.ok(
			Math.abs(stored.expiresAt.getTime() - expectedExpiry) <
				CLOCK_TOLERANCE_MS
		);
	});

	void it("never exposes the token or its hash in the response", async () => {
		const admin = await createUserWithSession("admin");
		const { rawToken } = await inviteAndReadMail(admin);

		const email = inviteeEmail();
		const response = await postInvitation(admin.authorization, { email });

		const serialized = JSON.stringify(response.body);
		assert.equal(serialized.includes(rawToken), false);
		assert.equal(serialized.includes(hashOneTimeToken(rawToken)), false);
		assert.equal("tokenHash" in response.body.data.invitation, false);
	});

	void it("sends the invitation email to the invited address", async () => {
		const admin = await createUserWithSession("admin");
		const email = inviteeEmail();

		await postInvitation(admin.authorization, { email }).expect(201);

		const mail = findLastMailTo(email);
		assert.ok(mail);
		assert.equal(mail.to, email);
		assert.equal(mail.subject, "You're invited to Completr");
		assert.ok(mail.html.length > 0);
		assert.equal(
			InMemoryMailProvider.outbox.filter(sent => sent.to === email).length,
			1
		);
	});

	void it("links the email to the accept page with the raw token", async () => {
		const admin = await createUserWithSession("admin");
		const { mail, rawToken } = await inviteAndReadMail(admin);

		const acceptUrl = new URL(
			"/accept-invite",
			environmentConfig.WEB_APP_URL
		);
		acceptUrl.searchParams.set("token", rawToken);
		assert.ok(mail.text.includes(acceptUrl.toString()));
		assert.ok(mail.html.includes(rawToken));
		assert.match(rawToken, /^[a-f0-9]{64}$/);
	});

	void it("mentions the configured TTL in the email", async () => {
		const admin = await createUserWithSession("admin");
		const { mail } = await inviteAndReadMail(admin);

		assert.ok(
			mail.text.includes(
				`expires in ${environmentConfig.USER_INVITATION_TTL_DAYS} days`
			)
		);
	});

	void it("lets the emailed token be looked up with GET /invitations/:token", async () => {
		const admin = await createUserWithSession("admin");
		const { email, invitation, rawToken } = await inviteAndReadMail(admin);

		const response = await api().get(`/invitations/${rawToken}`);

		assert.equal(response.status, 200);
		assert.deepEqual(Object.keys(response.body.data.invitation).sort(), [
			"email",
			"expiresAt"
		]);
		assert.equal(response.body.data.invitation.email, email);
		assert.equal(
			new Date(response.body.data.invitation.expiresAt).getTime(),
			new Date(invitation.expiresAt).getTime()
		);
	});

	void it("lets the emailed token create the account with the invited email", async () => {
		const admin = await createUserWithSession("admin");
		const { email, invitation, rawToken } = await inviteAndReadMail(admin);
		const payload = acceptPayload(rawToken);

		const response = await api().post("/invitations/accept").send(payload);

		assert.equal(response.status, 201);
		assert.equal("email" in response.body.data.user, false);
		assert.equal(response.body.data.user.username, payload.username);
		assert.equal(response.body.data.user.role, "user");
		assert.ok(response.body.data.access_token);
		assert.ok(response.body.data.session_id);
		assert.ok(
			(response.headers["set-cookie"] as unknown as string[]).some(cookie =>
				cookie.startsWith("refresh_token=")
			)
		);
		const stored = await User.findOne({ where: { email } });
		assert.ok(stored);
		assert.equal(stored.id, response.body.data.user.id);
		assert.equal(stored.isActive, true);
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			0
		);
		await api()
			.post("/auth/login")
			.send({ email, password: DEFAULT_PASSWORD })
			.expect(200);
	});

	void it("records the invitation in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await inviteAndReadMail(admin);

		const entry = await auditEntry("user_invited", invitation.id);

		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "invitation");
	});

	void it("lowercases the invited email", async () => {
		const admin = await createUserWithSession("admin");
		const email = inviteeEmail();

		const response = await postInvitation(admin.authorization, {
			email: email.toUpperCase()
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.invitation.email, email);
		assert.ok(findLastMailTo(email));
		assert.equal(await UserInvitation.count({ where: { email } }), 1);
	});

	void it("shows the new invitation in the admin listing", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await inviteAndReadMail(admin);

		const listing = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);

		const ids = (listing.body.data.invitations as InvitationBody[]).map(
			entry => entry.id
		);
		assert.equal(ids.includes(invitation.id), true);
	});

	void describe("business rules", () => {
		void it("answers 409 INVITATION_EMAIL_REGISTERED for an email with an account", async () => {
			const admin = await createUserWithSession("admin");
			const existing = await createUser();

			const response = await postInvitation(admin.authorization, {
				email: existing.email
			});

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "INVITATION_EMAIL_REGISTERED");
			assert.equal(
				await UserInvitation.count({ where: { email: existing.email } }),
				0
			);
			assert.equal(findLastMailTo(existing.email), undefined);
		});

		void it("answers 409 INVITATION_EMAIL_REGISTERED for a deactivated account", async () => {
			const admin = await createUserWithSession("admin");
			const existing = await createUser({ isActive: false });

			const response = await postInvitation(admin.authorization, {
				email: existing.email
			});

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "INVITATION_EMAIL_REGISTERED");
			assert.equal(findLastMailTo(existing.email), undefined);
		});

		void it("detects a registered email regardless of the casing sent", async () => {
			const admin = await createUserWithSession("admin");
			const existing = await createUser();

			const response = await postInvitation(admin.authorization, {
				email: existing.email.toUpperCase()
			});

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "INVITATION_EMAIL_REGISTERED");
		});

		void it("does not let an admin invite their own email", async () => {
			const admin = await createUserWithSession("admin");

			const response = await postInvitation(admin.authorization, {
				email: admin.user.email
			});

			assert.equal(response.status, 409);
			assert.equal(response.body.type, "INVITATION_EMAIL_REGISTERED");
		});

		void it("replaces the pending invitation when the same email is invited again", async () => {
			const admin = await createUserWithSession("admin");
			const email = inviteeEmail();
			const first = await postInvitation(admin.authorization, {
				email
			}).expect(201);
			const firstToken = extractTokenFromMail(await waitForMailTo(email));
			clearOutbox();

			const second = await postInvitation(admin.authorization, {
				email
			}).expect(201);
			const secondToken = extractTokenFromMail(await waitForMailTo(email));

			assert.notEqual(
				second.body.data.invitation.id,
				first.body.data.invitation.id
			);
			assert.notEqual(secondToken, firstToken);
			assert.equal(await UserInvitation.count({ where: { email } }), 1);
			const stale = await api().get(`/invitations/${firstToken}`);
			assert.equal(stale.status, 404);
			assert.equal(stale.body.type, "INVITATION_INVALID_TOKEN");
			await api().get(`/invitations/${secondToken}`).expect(200);
		});

		void it("resends the email when the same email is invited again", async () => {
			const admin = await createUserWithSession("admin");
			const email = inviteeEmail();

			await postInvitation(admin.authorization, { email }).expect(201);
			await postInvitation(admin.authorization, { email }).expect(201);

			assert.equal(
				InMemoryMailProvider.outbox.filter(sent => sent.to === email)
					.length,
				2
			);
		});

		void it("reinvites an email whose invitation already expired", async () => {
			const admin = await createUserWithSession("admin");
			const { email, invitation, rawToken } =
				await inviteAndReadMail(admin);
			await UserInvitation.update(
				{ expiresAt: new Date(Date.now() - 1_000) },
				{ where: { id: invitation.id } }
			);
			await api().get(`/invitations/${rawToken}`).expect(404);
			clearOutbox();

			const response = await postInvitation(admin.authorization, {
				email
			});

			assert.equal(response.status, 201);
			assert.equal(response.body.data.invitation.isExpired, false);
			const freshToken = extractTokenFromMail(await waitForMailTo(email));
			await api().get(`/invitations/${freshToken}`).expect(200);
		});

		void it("lets the same admin invite several different emails", async () => {
			const admin = await createUserWithSession("admin");

			await inviteAndReadMail(admin);
			await inviteAndReadMail(admin);

			assert.equal(
				await UserInvitation.count({
					where: { invitedById: admin.user.id }
				}),
				2
			);
		});

		void it("answers 502 MAIL_SEND_ERROR and discards the invitation when the email cannot be sent", async () => {
			const admin = await createUserWithSession("admin");
			const email = inviteeEmail();
			mock.method(InMemoryMailProvider.prototype, "send", () =>
				Promise.reject(sendError(new Error("smtp down")))
			);

			const response = await postInvitation(admin.authorization, {
				email
			});

			assert.equal(response.status, 502);
			assert.equal(response.body.type, "MAIL_SEND_ERROR");
			assert.equal(await UserInvitation.count({ where: { email } }), 0);
		});

		void it("keeps no pending invitation after a failed resend", async () => {
			const admin = await createUserWithSession("admin");
			const { email, rawToken } = await inviteAndReadMail(admin);
			mock.method(InMemoryMailProvider.prototype, "send", () =>
				Promise.reject(sendError(new Error("smtp down")))
			);

			await postInvitation(admin.authorization, { email }).expect(502);

			assert.equal(await UserInvitation.count({ where: { email } }), 0);
			await api().get(`/invitations/${rawToken}`).expect(404);
		});
	});

	void describe("validation", () => {
		const invalidBodies: [string, unknown][] = [
			["an empty body", {}],
			["a missing email", { name: "Someone" }],
			["a null email", { email: null }],
			["a numeric email", { email: 12345 }],
			["an empty email", { email: "" }],
			["an email without domain", { email: "invitee@" }],
			["an email without at sign", { email: "invitee.completr.test" }],
			["an email with spaces around it", { email: " invitee@completr.test " }],
			[
				"unknown fields",
				{ email: "invitee@completr.test", role: "admin" }
			]
		];

		for (const [name, body] of invalidBodies) {
			void it(`rejects ${name} with 422 COMMON_SCHEMA_INVALID`, async () => {
				const admin = await createUserWithSession("admin");
				const invitationsBefore = await UserInvitation.count();
				const mailsBefore = InMemoryMailProvider.outbox.length;

				const response = await postInvitation(admin.authorization, body);

				assert.equal(response.status, 422);
				assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
				assert.equal(await UserInvitation.count(), invitationsBefore);
				assert.equal(InMemoryMailProvider.outbox.length, mailsBefore);
			});
		}
	});

	void describe("role matrix", () => {
		for (const role of NON_ADMIN_ROLES) {
			void it(`hides the route from a ${role}: no invitation, no email`, async () => {
				const account = await createUserWithSession(role);
				const email = inviteeEmail();

				const response = await postInvitation(account.authorization, {
					email
				});

				assert.equal(response.status, 404);
				assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
				assert.equal(
					await UserInvitation.count({ where: { email } }),
					0
				);
				assert.equal(findLastMailTo(email), undefined);
			});
		}

		void it("answers a non admin with an invalid body the same 404 before validating", async () => {
			const account = await createUserWithSession("user");

			const response = await postInvitation(account.authorization, {});

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});

		void it("hides the route from an anonymous caller", async () => {
			const email = inviteeEmail();

			const response = await api()
				.post("/admin/invitations")
				.send({ email });

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(await UserInvitation.count({ where: { email } }), 0);
		});

		void it("hides the route behind an invalid token", async () => {
			const response = await api()
				.post("/admin/invitations")
				.set("Authorization", "Bearer invalid-token")
				.send({ email: inviteeEmail() });

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});

		void it("hides the route from a deactivated admin", async () => {
			const admin = await createUserWithSession("admin");
			await admin.user.update({ isActive: false });
			const email = inviteeEmail();

			const response = await postInvitation(admin.authorization, {
				email
			});

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(await UserInvitation.count({ where: { email } }), 0);
		});
	});
});

void describe("GET /admin/invitations", () => {
	void it("answers 200 with the invitations of every admin, newest first", async () => {
		const firstAdmin = await createUserWithSession("admin");
		const secondAdmin = await createUserWithSession("admin");
		const { invitation: older } = await createInvitation(
			firstAdmin.user.id
		);
		await older.update({ createdAt: new Date(Date.now() - 2 * DAY_MS) });
		const { invitation: newer } = await createInvitation(
			secondAdmin.user.id
		);

		const response = await api()
			.get("/admin/invitations")
			.set("Authorization", firstAdmin.authorization);

		assert.equal(response.status, 200);
		const ids = (response.body.data.invitations as InvitationBody[])
			.map(entry => entry.id)
			.filter(id => id === older.id || id === newer.id);
		assert.deepEqual(ids, [newer.id, older.id]);
	});

	void it("serializes the public fields and no token data", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);

		const response = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);

		const entry = (response.body.data.invitations as InvitationBody[]).find(
			listed => listed.id === invitation.id
		);
		assert.ok(entry);
		assert.deepEqual(Object.keys(entry).sort(), [
			"createdAt",
			"email",
			"expiresAt",
			"id",
			"isExpired"
		]);
		assert.equal(entry.email, invitation.email);
		assert.equal(entry.isExpired, false);
	});

	void it("flags an expired invitation with isExpired and keeps it listed", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(admin.user.id);
		await invitation.update({ expiresAt: new Date(Date.now() - 1_000) });

		const response = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);

		const entry = (response.body.data.invitations as InvitationBody[]).find(
			listed => listed.id === invitation.id
		);
		assert.ok(entry);
		assert.equal(entry.isExpired, true);
	});

	void it("lists an invitation whose inviter was deleted", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation } = await createInvitation(null);

		const response = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);

		const ids = (response.body.data.invitations as InvitationBody[]).map(
			entry => entry.id
		);
		assert.equal(ids.includes(invitation.id), true);
	});

	void it("drops an accepted invitation from the listing", async () => {
		const admin = await createUserWithSession("admin");
		const { invitation, rawToken } = await inviteAndReadMail(admin);
		await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken))
			.expect(201);

		const response = await api()
			.get("/admin/invitations")
			.set("Authorization", admin.authorization)
			.expect(200);

		const ids = (response.body.data.invitations as InvitationBody[]).map(
			entry => entry.id
		);
		assert.equal(ids.includes(invitation.id), false);
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role}`, async () => {
			const account = await createUserWithSession(role);

			const response = await api()
				.get("/admin/invitations")
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});
	}

	void it("hides the route from an anonymous caller", async () => {
		const response = await api().get("/admin/invitations");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("GET /invitations/:token", () => {
	void it("answers 404 INVITATION_INVALID_TOKEN for an unknown token", async () => {
		const { rawToken } = generateOneTimeToken();

		const response = await api().get(`/invitations/${rawToken}`);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("answers 404 INVITATION_INVALID_TOKEN for an expired invitation", async () => {
		const { invitation, rawToken } = await createInvitation();
		await invitation.update({ expiresAt: new Date(Date.now() - 1_000) });

		const response = await api().get(`/invitations/${rawToken}`);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("does not accept the stored hash as a token", async () => {
		const { invitation } = await createInvitation();

		const response = await api().get(`/invitations/${invitation.tokenHash}`);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
	});

	for (const [name, token] of [
		["a short token", "abc123"],
		["a non hexadecimal token", "z".repeat(64)],
		["an uppercase token", "A".repeat(64)]
	]) {
		void it(`rejects ${name} with 422 COMMON_SCHEMA_INVALID`, async () => {
			const response = await api().get(`/invitations/${token}`);

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		});
	}

	void it("needs no authentication", async () => {
		const { rawToken } = await createInvitation();

		const response = await api().get(`/invitations/${rawToken}`);

		assert.equal(response.status, 200);
	});
});

void describe("POST /invitations/accept", () => {
	void it("is single use", async () => {
		const admin = await createUserWithSession("admin");
		const { rawToken } = await inviteAndReadMail(admin);
		await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken))
			.expect(201);

		const second = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken));

		assert.equal(second.status, 404);
		assert.equal(second.body.type, "INVITATION_INVALID_TOKEN");
		const lookup = await api().get(`/invitations/${rawToken}`);
		assert.equal(lookup.status, 404);
	});

	void it("answers 404 INVITATION_INVALID_TOKEN for an unknown token", async () => {
		const { rawToken } = generateOneTimeToken();

		const response = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken));

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
	});

	void it("answers 404 INVITATION_INVALID_TOKEN for an expired invitation and creates no account", async () => {
		const { invitation, rawToken } = await createInvitation();
		await invitation.update({ expiresAt: new Date(Date.now() - 1_000) });

		const response = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken));

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "INVITATION_INVALID_TOKEN");
		assert.equal(
			await User.count({ where: { email: invitation.email } }),
			0
		);
	});

	void it("does not let the invited person choose another email", async () => {
		const { rawToken } = await createInvitation();

		const response = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken, { email: "other@completr.test" }));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(
			await User.count({ where: { email: "other@completr.test" } }),
			0
		);
	});

	void it("answers 409 AUTH_USER_ALREADY_EXISTS for a taken username and keeps the invitation usable", async () => {
		const taken = await createUser();
		const { invitation, rawToken } = await createInvitation();

		const conflict = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken, { username: taken.username }));

		assert.equal(conflict.status, 409);
		assert.equal(conflict.body.type, "AUTH_USER_ALREADY_EXISTS");
		assert.equal(
			await UserInvitation.count({ where: { id: invitation.id } }),
			1
		);
		await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken))
			.expect(201);
	});

	void it("answers 409 AUTH_USER_ALREADY_EXISTS when the email got an account in the meantime", async () => {
		const { invitation, rawToken } = await createInvitation();
		await createUser({ email: invitation.email });

		const response = await api()
			.post("/invitations/accept")
			.send(acceptPayload(rawToken));

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "AUTH_USER_ALREADY_EXISTS");
	});

	const invalidPayloads: [string, Record<string, unknown>][] = [
		["a missing token", { token: undefined }],
		["a malformed token", { token: "not-a-token" }],
		["a username shorter than 4", { username: "abc" }],
		["a username longer than 15", { username: "a".repeat(16) }],
		["an uppercase username", { username: "UpperCase" }],
		["a username with spaces", { username: "with space" }],
		["a missing username", { username: undefined }],
		["a name shorter than 4", { name: "Bob" }],
		["a name with angle brackets", { name: "<b>Invited</b>" }],
		["a missing name", { name: undefined }],
		["a password under 8 characters", { password: "Aa1!" }],
		["a password without uppercase", { password: "passw0rd!" }],
		["a password without a digit", { password: "Password!" }],
		["a password without a special character", { password: "Passw0rdd" }],
		["a missing password", { password: undefined }]
	];

	for (const [name, overrides] of invalidPayloads) {
		void it(`rejects ${name} with 422 COMMON_SCHEMA_INVALID and keeps the invitation`, async () => {
			const { invitation, rawToken } = await createInvitation();

			const response = await api()
				.post("/invitations/accept")
				.send(acceptPayload(rawToken, overrides));

			assert.equal(response.status, 422);
			assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
			assert.equal(
				await UserInvitation.count({ where: { id: invitation.id } }),
				1
			);
			assert.equal(
				await User.count({ where: { email: invitation.email } }),
				0
			);
		});
	}
});
