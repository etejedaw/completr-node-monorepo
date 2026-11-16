import { sequelize } from "../../database/sequelize.database";
import { resolvePremiumAccess } from "../../premium-access/services/premium-access.service";
import { type RewindEditionRecord } from "../../rewind-editions/rewind-editions.interface";
import * as rewindEditionsService from "../../rewind-editions/services/rewind-editions.service";
import * as usersService from "../../users/services/users.service";
import { type User } from "../../users/user.model";
import { Rewind as RewindModel } from "../rewind.model";
import { type ClosedEditionRewindRequest } from "../rewind-closed-edition.interface";
import {
	type ClosedEditionRewindClaim,
	type ClosedEditionRewindOutcome,
	type ClosedEditionRewindRefusal
} from "../rewind-closed-edition.types";
import { type RewindCalendar } from "../rewind-run.interface";
import { isAiRecapInProgress } from "../utils/is-ai-recap-in-progress.util";
import { resolveClosedRewindEdition } from "../utils/resolve-closed-rewind-edition.util";
import { resolveCurrentRewindDay } from "../utils/resolve-current-rewind-day.util";
import { runRecap } from "./rewind-ai-recap.service";
import { freezeRewind } from "./rewind-freeze.service";

function refused(reason: ClosedEditionRewindRefusal) {
	return { kind: "refused" as const, reason };
}

async function findClosedEdition(
	year: number,
	now: Date
): Promise<RewindEditionRecord | ClosedEditionRewindRefusal> {
	const edition = await rewindEditionsService.findRewindEditionByYear(year);
	if (!edition) return "edition-missing";
	const closed = resolveClosedRewindEdition({
		today: resolveCurrentRewindDay(now),
		edition
	});
	return closed ?? "edition-not-closed";
}

function claimRewind(
	owner: User,
	year: number,
	force: boolean,
	now: Date
): Promise<ClosedEditionRewindClaim> {
	return sequelize.transaction(async transaction => {
		const record = await RewindModel.findOne({
			where: { userId: owner.id, year },
			lock: transaction.LOCK.UPDATE,
			transaction
		});
		if (!record) return refused("rewind-missing");
		if (record.frozenAt && !force) return refused("already-frozen");
		if (isAiRecapInProgress(record, now))
			return refused("recap-in-progress");

		await record.update(
			{
				aiRecapStatus: "pending",
				aiRecapRequestedAt: now,
				snapshot: null,
				frozenAt: null
			},
			{ transaction }
		);
		return { kind: "claimed", record };
	});
}

function closedEditionCalendar(
	owner: User,
	edition: RewindEditionRecord,
	now: Date
): RewindCalendar {
	return {
		today: resolveCurrentRewindDay(now),
		firstYear: Math.min(owner.createdAt.getUTCFullYear(), edition.year),
		edition,
		upcomingEdition: null
	};
}

async function writeRecap(
	owner: User,
	record: RewindModel,
	edition: RewindEditionRecord,
	now: Date
): Promise<boolean> {
	return runRecap({
		owner,
		record,
		calendar: closedEditionCalendar(owner, edition, now),
		reusablePremiumStats: null,
		premiumAccess: await resolvePremiumAccess(owner, "rewind.premium"),
		spend: null
	});
}

async function freezeWithEdition(
	record: RewindModel,
	edition: RewindEditionRecord,
	aiRecapReady: boolean
): Promise<ClosedEditionRewindOutcome> {
	const outcome = await freezeRewind(record.id, edition);
	const frozenAt = outcome.record?.frozenAt;
	if (outcome.kind !== "frozen" || !frozenAt)
		return { kind: "not-frozen", aiRecapReady, freeze: outcome.kind };
	return { kind: "frozen", aiRecapReady, design: edition.design, frozenAt };
}

export async function generateClosedEditionRewind(
	request: ClosedEditionRewindRequest,
	now: Date = new Date()
): Promise<ClosedEditionRewindOutcome> {
	const owner = await usersService.findUserByUsername(request.username);
	if (!owner) return refused("user-missing");
	const edition = await findClosedEdition(request.year, now);
	if (typeof edition === "string") return refused(edition);

	const claim = await claimRewind(owner, request.year, request.force, now);
	if (claim.kind === "refused") return claim;

	const aiRecapReady = await writeRecap(owner, claim.record, edition, now);
	if (!aiRecapReady && !request.skipAi) return { kind: "ai-failed" };
	return freezeWithEdition(claim.record, edition, aiRecapReady);
}
