import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { AuditLog } from "../../src/audit/audit.model";
import { User } from "../../src/users/user.model";
import { type UserRole } from "../../src/users/user-role.type";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import { eventually } from "../helpers/eventually.helper";
import { createUser, DEFAULT_PASSWORD } from "../helpers/factories.helper";

useTestDatabase();

const NON_ADMIN_ROLES: UserRole[] = ["user", "premium", "moderator"];

function uniqueSuffix() {
	return randomUUID().replaceAll("-", "").slice(0, 8);
}

function newUserPayload(overrides: Record<string, unknown> = {}) {
	const suffix = uniqueSuffix();
	return {
		username: `adm_${suffix}`,
		email: `adm_${suffix}@completr.test`,
		password: DEFAULT_PASSWORD,
		name: `Created ${suffix}`,
		...overrides
	};
}

function auditEntry(action: string, targetId: string) {
	return eventually(async () => {
		const entry = await AuditLog.findOne({ where: { action, targetId } });
		assert.ok(entry, `no audit entry ${action} for ${targetId}`);
		return entry;
	});
}

interface AdminUserBody {
	id: string;
	username: string;
	email: string;
	name: string;
	role: UserRole;
	isActive: boolean;
}

void describe("POST /admin/users", () => {
	void it("lets an admin create an account that can log in", async () => {
		const admin = await createUserWithSession("admin");
		const payload = newUserPayload({ bio: "Created by an admin" });

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(payload);

		assert.equal(response.status, 201);
		assert.equal(response.body.data.user.username, payload.username);
		assert.equal(response.body.data.user.name, payload.name);
		assert.equal(response.body.data.user.role, "user");
		assert.equal(response.body.data.user.password, undefined);

		const stored = await User.findOne({
			where: { username: payload.username }
		});
		assert.ok(stored);
		assert.equal(stored.email, payload.email);
		assert.equal(stored.isActive, true);

		await api()
			.post("/auth/login")
			.send({ email: payload.email, password: payload.password })
			.expect(200);
	});

	void it("records the creation in the audit log", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(newUserPayload());
		assert.equal(response.status, 201);

		const entry = await auditEntry(
			"user_created",
			response.body.data.user.id
		);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "user");
	});

	void it("rejects an email that is already registered with 409 AUTH_USER_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createUser();

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(newUserPayload({ email: existing.email }));

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "AUTH_USER_ALREADY_EXISTS");
	});

	void it("rejects a username that is already taken with 409 AUTH_USER_ALREADY_EXISTS", async () => {
		const admin = await createUserWithSession("admin");
		const existing = await createUser();

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(newUserPayload({ username: existing.username }));

		assert.equal(response.status, 409);
		assert.equal(response.body.type, "AUTH_USER_ALREADY_EXISTS");
	});

	void it("rejects a weak password with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const payload = newUserPayload({ password: "weakpass" });

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(payload);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(
			await User.count({ where: { username: payload.username } }),
			0
		);
	});

	void it("rejects an invalid email with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(newUserPayload({ email: "not-an-email" }));

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a role in the body so an account cannot be created as admin", async () => {
		const admin = await createUserWithSession("admin");
		const payload = newUserPayload({ role: "admin" });

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(payload);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		assert.equal(
			await User.count({ where: { username: payload.username } }),
			0
		);
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} with 404 AUTH_ROUTE_NOT_FOUND`, async () => {
			const account = await createUserWithSession(role);
			const payload = newUserPayload();

			const response = await api()
				.post("/admin/users")
				.set("Authorization", account.authorization)
				.send(payload);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			assert.equal(
				await User.count({ where: { username: payload.username } }),
				0
			);
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const payload = newUserPayload();

		const response = await api().post("/admin/users").send(payload);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		assert.equal(
			await User.count({ where: { username: payload.username } }),
			0
		);
	});

	void it("hides the route from a deactivated admin", async () => {
		const admin = await createUserWithSession("admin");
		await admin.user.update({ isActive: false });

		const response = await api()
			.post("/admin/users")
			.set("Authorization", admin.authorization)
			.send(newUserPayload());

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

async function setCreatedAtMinutesFromNow(userId: string, minutes: number) {
	await User.sequelize!.query(
		`UPDATE "Users" SET "createdAt" = NOW() + make_interval(mins => :minutes) WHERE id = :userId`,
		{ replacements: { minutes, userId } }
	);
}

void describe("GET /admin/users", () => {
	void it("lists users with the admin serialization and the total", async () => {
		const admin = await createUserWithSession("admin");
		const inactive = await createUser({
			role: "moderator",
			isActive: false
		});

		const response = await api()
			.get("/admin/users")
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.equal(response.body.data.total, await User.count());
		const listed = (response.body.data.users as AdminUserBody[]).find(
			user => user.id === inactive.id
		);
		assert.ok(listed);
		assert.equal(listed.username, inactive.username);
		assert.equal(listed.email, inactive.email);
		assert.equal(listed.role, "moderator");
		assert.equal(listed.isActive, false);
		assert.equal("password" in listed, false);
	});

	void it("orders users from newest to oldest and paginates with limit and offset", async () => {
		const admin = await createUserWithSession("admin");
		const older = await createUser();
		const newer = await createUser();
		await setCreatedAtMinutesFromNow(older.id, 1);
		await setCreatedAtMinutesFromNow(newer.id, 2);

		const firstPage = await api()
			.get("/admin/users")
			.query({ limit: 1 })
			.set("Authorization", admin.authorization);
		assert.equal(firstPage.status, 200);
		assert.equal(firstPage.body.data.users.length, 1);
		assert.equal(firstPage.body.data.users[0].id, newer.id);

		const secondPage = await api()
			.get("/admin/users")
			.query({ limit: 1, offset: 1 })
			.set("Authorization", admin.authorization);
		assert.equal(secondPage.status, 200);
		assert.equal(secondPage.body.data.users[0].id, older.id);
		assert.equal(secondPage.body.data.total, firstPage.body.data.total);
	});

	void it("returns an empty page when the offset is past the end", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.get("/admin/users")
			.query({ offset: 10_000 })
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.users, []);
		assert.ok(response.body.data.total >= 1);
	});

	void it("rejects an out of range limit with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.get("/admin/users")
			.query({ limit: 101 })
			.set("Authorization", admin.authorization);

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} with 404 AUTH_ROUTE_NOT_FOUND`, async () => {
			const account = await createUserWithSession(role);

			const response = await api()
				.get("/admin/users")
				.set("Authorization", account.authorization);

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const response = await api().get("/admin/users");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});

	void it("hides the route behind an invalid token with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const response = await api()
			.get("/admin/users")
			.set("Authorization", "Bearer expired.token.value");

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
	});
});

void describe("PATCH /admin/users/:userId", () => {
	void it("updates name, role and activation and returns the admin serialization", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({
				name: "Renamed By Admin",
				role: "premium",
				isActive: false
			});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.user.id, target.id);
		assert.equal(response.body.data.user.name, "Renamed By Admin");
		assert.equal(response.body.data.user.role, "premium");
		assert.equal(response.body.data.user.isActive, false);

		await target.reload();
		assert.equal(target.name, "Renamed By Admin");
		assert.equal(target.role, "premium");
		assert.equal(target.isActive, false);
	});

	void it("leaves the account untouched when the body is empty", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser({ role: "premium" });

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({});

		assert.equal(response.status, 200);
		assert.equal(response.body.data.user.name, target.name);
		assert.equal(response.body.data.user.role, "premium");
		assert.equal(response.body.data.user.isActive, true);
	});

	void it("replaces the password so only the new one can log in", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();
		const newPassword = "BrandNewPass1!";

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ password: newPassword });
		assert.equal(response.status, 200);

		await api()
			.post("/auth/login")
			.send({ email: target.email, password: DEFAULT_PASSWORD })
			.expect(401);
		await api()
			.post("/auth/login")
			.send({ email: target.email, password: newPassword })
			.expect(200);
	});

	void it("applies a promotion to the next request of the promoted account", async () => {
		const admin = await createUserWithSession("admin");
		const regular = await createUserWithSession();

		await api()
			.get("/admin/game-reports")
			.set("Authorization", regular.authorization)
			.expect(404);

		await api()
			.patch(`/admin/users/${regular.user.id}`)
			.set("Authorization", admin.authorization)
			.send({ role: "moderator" })
			.expect(200);

		await api()
			.get("/admin/game-reports")
			.set("Authorization", regular.authorization)
			.expect(200);
	});

	void it("locks a deactivated account out and lets it back in when reactivated", async () => {
		const admin = await createUserWithSession("admin");
		const regular = await createUserWithSession();

		await api()
			.patch(`/admin/users/${regular.user.id}`)
			.set("Authorization", admin.authorization)
			.send({ isActive: false })
			.expect(200);

		const locked = await api()
			.get("/users/me")
			.set("Authorization", regular.authorization);
		assert.equal(locked.status, 401);
		assert.equal(locked.body.type, "AUTH_INVALID_TOKEN");

		await api()
			.patch(`/admin/users/${regular.user.id}`)
			.set("Authorization", admin.authorization)
			.send({ isActive: true })
			.expect(200);

		await api()
			.get("/users/me")
			.set("Authorization", regular.authorization)
			.expect(200);
	});

	void it("shows the edit in the user listing", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ name: "Listed Again" })
			.expect(200);

		const listing = await api()
			.get("/admin/users")
			.query({ limit: 100 })
			.set("Authorization", admin.authorization)
			.expect(200);
		const listed = (listing.body.data.users as AdminUserBody[]).find(
			user => user.id === target.id
		);
		assert.equal(listed?.name, "Listed Again");
	});

	void it("records the edit in the audit log", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ role: "premium" })
			.expect(200);

		const entry = await auditEntry("user_edited", target.id);
		assert.equal(entry.userId, admin.user.id);
		assert.equal(entry.targetType, "user");
	});

	void it("answers 404 USER_NOT_FOUND for an unknown user", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.patch(`/admin/users/${randomUUID()}`)
			.set("Authorization", admin.authorization)
			.send({ name: "Ghost" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "USER_NOT_FOUND");
	});

	void it("rejects a malformed user id with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");

		const response = await api()
			.patch("/admin/users/not-a-uuid")
			.set("Authorization", admin.authorization)
			.send({ name: "Ghost" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects an unknown role with 422 and keeps the stored role", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ role: "superadmin" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
		await target.reload();
		assert.equal(target.role, "user");
	});

	void it("rejects a short password with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ password: "short" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	void it("rejects a name with angle brackets with 422 COMMON_SCHEMA_INVALID", async () => {
		const admin = await createUserWithSession("admin");
		const target = await createUser();

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.set("Authorization", admin.authorization)
			.send({ name: "<script>" });

		assert.equal(response.status, 422);
		assert.equal(response.body.type, "COMMON_SCHEMA_INVALID");
	});

	for (const role of NON_ADMIN_ROLES) {
		void it(`hides the route from a ${role} and keeps the target untouched`, async () => {
			const account = await createUserWithSession(role);
			const target = await createUser();

			const response = await api()
				.patch(`/admin/users/${target.id}`)
				.set("Authorization", account.authorization)
				.send({ role: "admin", isActive: false });

			assert.equal(response.status, 404);
			assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
			await target.reload();
			assert.equal(target.role, "user");
			assert.equal(target.isActive, true);
		});

		void it(`does not let a ${role} promote itself to admin`, async () => {
			const account = await createUserWithSession(role);

			const response = await api()
				.patch(`/admin/users/${account.user.id}`)
				.set("Authorization", account.authorization)
				.send({ role: "admin" });

			assert.equal(response.status, 404);
			await account.user.reload();
			assert.equal(account.user.role, role);
		});
	}

	void it("hides the route from an anonymous caller with 404 AUTH_ROUTE_NOT_FOUND", async () => {
		const target = await createUser();

		const response = await api()
			.patch(`/admin/users/${target.id}`)
			.send({ role: "admin" });

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "AUTH_ROUTE_NOT_FOUND");
		await target.reload();
		assert.equal(target.role, "user");
	});
});
