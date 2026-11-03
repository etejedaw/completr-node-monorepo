import {
	ExternalDataAttempt,
	type ExternalDataAttemptSource,
	type ExternalDataAttemptStatus
} from "./external-data-attempt.model";

export async function findAll() {
	return ExternalDataAttempt.findAll({
		attributes: ["gameId", "source", "status", "attemptedAt"],
		raw: true
	});
}

export async function record(
	gameId: string,
	source: ExternalDataAttemptSource,
	status: ExternalDataAttemptStatus,
	attemptedAt = new Date()
) {
	await ExternalDataAttempt.upsert(
		{ gameId, source, status, attemptedAt },
		{ conflictFields: ["gameId", "source"] }
	);
}

export async function clear(gameId: string, source: ExternalDataAttemptSource) {
	await ExternalDataAttempt.destroy({ where: { gameId, source } });
}
