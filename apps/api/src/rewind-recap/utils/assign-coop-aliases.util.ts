import { type RewindRun } from "../../rewind/rewind-run.interface";
import { compareText } from "../../rewind/utils/compare-text.util";
import { type RewindCoopPartner } from "../rewind-recap.interface";

const COOP_ALIAS_PREFIX = "P";

function groupPartnerIdsByRun(
	coopPartners: RewindCoopPartner[]
): Map<string, string[]> {
	const partnerIdsByRun = new Map<string, string[]>();
	for (const { runId, partnerId } of coopPartners) {
		const partnerIds = partnerIdsByRun.get(runId) ?? [];
		if (!partnerIds.includes(partnerId)) partnerIds.push(partnerId);
		partnerIdsByRun.set(runId, partnerIds);
	}
	return partnerIdsByRun;
}

export function assignCoopAliases(
	chronologicalRuns: RewindRun[],
	coopPartners: RewindCoopPartner[]
): Map<string, string[]> {
	const partnerIdsByRun = groupPartnerIdsByRun(coopPartners);
	const aliasByPartner = new Map<string, string>();
	const aliasesByRun = new Map<string, string[]>();
	for (const run of chronologicalRuns) {
		const partnerIds = [...(partnerIdsByRun.get(run.id) ?? [])].sort(
			compareText
		);
		if (partnerIds.length === 0) continue;
		const aliases = partnerIds.map(partnerId => {
			const known = aliasByPartner.get(partnerId);
			if (known !== undefined) return known;
			const alias = `${COOP_ALIAS_PREFIX}${aliasByPartner.size + 1}`;
			aliasByPartner.set(partnerId, alias);
			return alias;
		});
		aliasesByRun.set(run.id, aliases);
	}
	return aliasesByRun;
}
