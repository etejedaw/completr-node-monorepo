import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import { BacklogProgress } from "../../src/backlog-progress/backlog-progress.model";
import { api } from "../helpers/app.helper";
import { createUserWithSession } from "../helpers/auth.helper";
import { useTestDatabase } from "../helpers/database.helper";
import {
	createBacklog,
	createGame,
	createPlatform
} from "../helpers/factories.helper";

useTestDatabase();

type Account = Awaited<ReturnType<typeof createUserWithSession>>;

const NON_EXISTENT_ID = "00000000-0000-4000-8000-000000000000";
const MAX_NOTE_LENGTH = 500;

interface ProgressNote {
	id: string;
	note: string;
	createdAt: string;
}

function progressPath(backlogId: string) {
	return `/users/me/backlog/${backlogId}/progress`;
}

function notePath(backlogId: string, noteId: string) {
	return `${progressPath(backlogId)}/${noteId}`;
}

async function seedBacklog(owner: Account) {
	const [game, platform] = await Promise.all([
		createGame(),
		createPlatform()
	]);
	return createBacklog(owner.user.id, game.id, platform.id, {
		status: "playing"
	});
}

function addNote(account: Account, backlogId: string, body: unknown) {
	return api()
		.post(progressPath(backlogId))
		.set("Authorization", account.authorization)
		.send(body as object);
}

function getNotes(account: Account, backlogId: string) {
	return api()
		.get(progressPath(backlogId))
		.set("Authorization", account.authorization);
}

function deleteNote(account: Account, backlogId: string, noteId: string) {
	return api()
		.delete(notePath(backlogId, noteId))
		.set("Authorization", account.authorization);
}

async function listNotes(account: Account, backlogId: string) {
	const response = await getNotes(account, backlogId).expect(200);
	return response.body.data.progress as ProgressNote[];
}

void describe("POST /users/me/backlog/:backlogId/progress", () => {
	void it("creates a note and returns it with id, note and createdAt", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {
			note: "Beat the first boss"
		});

		assert.equal(response.status, 201);
		const { progress } = response.body.data;
		assert.equal(progress.note, "Beat the first boss");
		assert.match(progress.id, /^[0-9a-f-]{36}$/);
		assert.ok(!Number.isNaN(Date.parse(progress.createdAt)));
		assert.deepEqual(Object.keys(progress).sort(), [
			"createdAt",
			"id",
			"note"
		]);
	});

	void it("persists the note and returns it in a later read", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const created = await addNote(owner, backlog.id, {
			note: "Reached chapter 2"
		}).expect(201);

		const stored = await BacklogProgress.findByPk(
			created.body.data.progress.id
		);
		assert.equal(stored?.backlogId, backlog.id);
		assert.equal(stored?.note, "Reached chapter 2");
		const notes = await listNotes(owner, backlog.id);
		assert.deepEqual(
			notes.map(note => note.id),
			[created.body.data.progress.id]
		);
	});

	void it("trims the surrounding whitespace of the note", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {
			note: "   Found the secret room   "
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.progress.note, "Found the secret room");
	});

	void it("accepts a note of exactly the maximum length", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {
			note: "a".repeat(MAX_NOTE_LENGTH)
		});

		assert.equal(response.status, 201);
		assert.equal(response.body.data.progress.note.length, MAX_NOTE_LENGTH);
	});

	void it("allows several notes on the same backlog entry", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		await addNote(owner, backlog.id, { note: "First" }).expect(201);
		await addNote(owner, backlog.id, { note: "Second" }).expect(201);

		const notes = await listNotes(owner, backlog.id);
		assert.equal(notes.length, 2);
	});

	void it("rejects an empty note with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, { note: "" });

		assert.equal(response.status, 422);
		assert.equal((await listNotes(owner, backlog.id)).length, 0);
	});

	void it("rejects a note made only of whitespace with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, { note: "     " });

		assert.equal(response.status, 422);
		assert.equal((await listNotes(owner, backlog.id)).length, 0);
	});

	void it("rejects a note longer than the maximum with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {
			note: "a".repeat(MAX_NOTE_LENGTH + 1)
		});

		assert.equal(response.status, 422);
		assert.equal((await listNotes(owner, backlog.id)).length, 0);
	});

	void it("rejects a body without note with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {});

		assert.equal(response.status, 422);
	});

	void it("rejects a note that is not a string with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, { note: 42 });

		assert.equal(response.status, 422);
	});

	void it("rejects unknown fields in the body with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(owner, backlog.id, {
			note: "Valid note",
			createdAt: "2020-01-01T00:00:00.000Z"
		});

		assert.equal(response.status, 422);
	});

	void it("rejects a backlogId that is not a UUID with 422", async () => {
		const owner = await createUserWithSession();

		const response = await addNote(owner, "not-a-uuid", {
			note: "Valid note"
		});

		assert.equal(response.status, 422);
	});

	void it("returns 404 for a backlog entry that does not exist", async () => {
		const owner = await createUserWithSession();

		const response = await addNote(owner, NON_EXISTENT_ID, {
			note: "Valid note"
		});

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND");
	});

	void it("forbids creating a note on the backlog of another user", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await addNote(intruder, backlog.id, {
			note: "Not my game"
		});

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_FORBIDDEN");
		assert.equal((await listNotes(owner, backlog.id)).length, 0);
	});

	void it("rejects a request without credentials", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api()
			.post(progressPath(backlog.id))
			.send({ note: "Anonymous" });

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api()
			.post(progressPath(backlog.id))
			.set("Authorization", "Bearer invalid-token")
			.send({ note: "Anonymous" });

		assert.equal(response.status, 401);
	});
});

void describe("GET /users/me/backlog/:backlogId/progress", () => {
	void it("returns an empty list for a backlog entry without notes", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await getNotes(owner, backlog.id);

		assert.equal(response.status, 200);
		assert.deepEqual(response.body.data.progress, []);
	});

	void it("returns the notes newest first with their serialized shape", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);
		const oldest = await BacklogProgress.create({
			backlogId: backlog.id,
			note: "Oldest",
			createdAt: new Date("2026-01-01T10:00:00.000Z")
		});
		const newest = await BacklogProgress.create({
			backlogId: backlog.id,
			note: "Newest",
			createdAt: new Date("2026-01-03T10:00:00.000Z")
		});
		const middle = await BacklogProgress.create({
			backlogId: backlog.id,
			note: "Middle",
			createdAt: new Date("2026-01-02T10:00:00.000Z")
		});

		const response = await getNotes(owner, backlog.id);

		assert.equal(response.status, 200);
		const notes = response.body.data.progress as ProgressNote[];
		assert.deepEqual(
			notes.map(note => note.id),
			[newest.id, middle.id, oldest.id]
		);
		assert.deepEqual(notes[0], {
			id: newest.id,
			note: "Newest",
			createdAt: "2026-01-03T10:00:00.000Z"
		});
	});

	void it("returns only the notes of the requested backlog entry", async () => {
		const owner = await createUserWithSession();
		const firstBacklog = await seedBacklog(owner);
		const secondBacklog = await seedBacklog(owner);
		await addNote(owner, firstBacklog.id, { note: "On the first" }).expect(
			201
		);
		await addNote(owner, secondBacklog.id, {
			note: "On the second"
		}).expect(201);

		const notes = await listNotes(owner, firstBacklog.id);

		assert.deepEqual(
			notes.map(note => note.note),
			["On the first"]
		);
	});

	void it("rejects a backlogId that is not a UUID with 422", async () => {
		const owner = await createUserWithSession();

		const response = await getNotes(owner, "not-a-uuid");

		assert.equal(response.status, 422);
	});

	void it("returns 404 for a backlog entry that does not exist", async () => {
		const owner = await createUserWithSession();

		const response = await getNotes(owner, NON_EXISTENT_ID);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND");
	});

	void it("forbids reading the notes of another user's backlog", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const backlog = await seedBacklog(owner);
		await addNote(owner, backlog.id, { note: "Private thought" }).expect(
			201
		);

		const response = await getNotes(intruder, backlog.id);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_FORBIDDEN");
		assert.equal(response.body.data, undefined);
	});

	void it("rejects a request without credentials", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api().get(progressPath(backlog.id));

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api()
			.get(progressPath(backlog.id))
			.set("Authorization", "Bearer invalid-token");

		assert.equal(response.status, 401);
	});
});

void describe("DELETE /users/me/backlog/:backlogId/progress/:noteId", () => {
	void it("deletes the note with 204 and removes it from later reads", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);
		const kept = await addNote(owner, backlog.id, { note: "Keep" }).expect(
			201
		);
		const removed = await addNote(owner, backlog.id, {
			note: "Remove"
		}).expect(201);
		const removedId = removed.body.data.progress.id;

		const response = await deleteNote(owner, backlog.id, removedId);

		assert.equal(response.status, 204);
		assert.deepEqual(response.body, {});
		assert.equal(await BacklogProgress.findByPk(removedId), null);
		const notes = await listNotes(owner, backlog.id);
		assert.deepEqual(
			notes.map(note => note.id),
			[kept.body.data.progress.id]
		);
	});

	void it("returns 404 when the note was already deleted", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);
		const created = await addNote(owner, backlog.id, {
			note: "Once"
		}).expect(201);
		const noteId = created.body.data.progress.id;
		await deleteNote(owner, backlog.id, noteId).expect(204);

		const response = await deleteNote(owner, backlog.id, noteId);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_NOTE_NOT_FOUND");
	});

	void it("returns 404 for a note that does not exist", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await deleteNote(owner, backlog.id, NON_EXISTENT_ID);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_NOTE_NOT_FOUND");
	});

	void it("returns 404 when the note belongs to another backlog entry of the same user", async () => {
		const owner = await createUserWithSession();
		const firstBacklog = await seedBacklog(owner);
		const secondBacklog = await seedBacklog(owner);
		const created = await addNote(owner, firstBacklog.id, {
			note: "Belongs to the first"
		}).expect(201);
		const noteId = created.body.data.progress.id;

		const response = await deleteNote(owner, secondBacklog.id, noteId);

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_NOTE_NOT_FOUND");
		assert.ok(await BacklogProgress.findByPk(noteId));
	});

	void it("returns 404 for a backlog entry that does not exist", async () => {
		const owner = await createUserWithSession();

		const response = await deleteNote(owner, NON_EXISTENT_ID, randomUUID());

		assert.equal(response.status, 404);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_BACKLOG_NOT_FOUND");
	});

	void it("rejects ids that are not UUIDs with 422", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const badNote = await deleteNote(owner, backlog.id, "not-a-uuid");
		const badBacklog = await deleteNote(owner, "not-a-uuid", randomUUID());

		assert.equal(badNote.status, 422);
		assert.equal(badBacklog.status, 422);
	});

	void it("forbids deleting a note from another user's backlog and keeps it", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const backlog = await seedBacklog(owner);
		const created = await addNote(owner, backlog.id, {
			note: "Mine"
		}).expect(201);
		const noteId = created.body.data.progress.id;

		const response = await deleteNote(intruder, backlog.id, noteId);

		assert.equal(response.status, 403);
		assert.equal(response.body.type, "BACKLOG_PROGRESS_FORBIDDEN");
		assert.ok(await BacklogProgress.findByPk(noteId));
		assert.equal((await listNotes(owner, backlog.id)).length, 1);
	});

	void it("does not delete a foreign note through the intruder's own backlog id", async () => {
		const owner = await createUserWithSession();
		const intruder = await createUserWithSession();
		const ownerBacklog = await seedBacklog(owner);
		const intruderBacklog = await seedBacklog(intruder);
		const created = await addNote(owner, ownerBacklog.id, {
			note: "Mine"
		}).expect(201);
		const noteId = created.body.data.progress.id;

		const response = await deleteNote(intruder, intruderBacklog.id, noteId);

		assert.equal(response.status, 404);
		assert.ok(await BacklogProgress.findByPk(noteId));
	});

	void it("rejects a request without credentials", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api().delete(
			notePath(backlog.id, NON_EXISTENT_ID)
		);

		assert.equal(response.status, 422);
	});

	void it("rejects an invalid token with 401", async () => {
		const owner = await createUserWithSession();
		const backlog = await seedBacklog(owner);

		const response = await api()
			.delete(notePath(backlog.id, NON_EXISTENT_ID))
			.set("Authorization", "Bearer invalid-token");

		assert.equal(response.status, 401);
	});
});
