import { Op, type WhereOptions } from "sequelize";

import { isUtcDayBetween } from "../common/utils/is-utc-day-between.util";
import { toUtcDay } from "../common/utils/to-utc-day.util";
import { RewindEdition } from "./rewind-edition.model";
import { type RewindEditionRecord } from "./rewind-editions.interface";

const REWIND_EDITION_ATTRS = [
	"id",
	"year",
	"opensAt",
	"closesAt",
	"graceStartsAt",
	"graceEndsAt",
	"design",
	"premiumRegenerations",
	"giftRegenerations",
	"frozenAt"
];

function toEditionRecord(edition: RewindEdition): RewindEditionRecord {
	return {
		year: edition.year,
		opensAt: edition.opensAt,
		closesAt: edition.closesAt,
		graceStartsAt: edition.graceStartsAt,
		graceEndsAt: edition.graceEndsAt,
		design: edition.design,
		premiumRegenerations: edition.premiumRegenerations,
		giftRegenerations: edition.giftRegenerations,
		frozenAt: edition.frozenAt
	};
}

async function findLatestEditionWhere(
	where: WhereOptions
): Promise<RewindEditionRecord | null> {
	const edition = await RewindEdition.findOne({
		attributes: REWIND_EDITION_ATTRS,
		where,
		order: [
			["opensAt", "DESC"],
			["id", "DESC"]
		]
	});
	return edition ? toEditionRecord(edition) : null;
}

export function isRewindEditionOpenOn(
	edition: Pick<RewindEditionRecord, "opensAt" | "closesAt">,
	today: Date
): boolean {
	return isUtcDayBetween(today, edition.opensAt, edition.closesAt);
}

export function isRewindGraceOpenOn(
	edition: Pick<RewindEditionRecord, "graceStartsAt" | "graceEndsAt">,
	today: Date
): boolean {
	return isUtcDayBetween(today, edition.graceStartsAt, edition.graceEndsAt);
}

export function findCurrentRewindEdition(
	today: Date
): Promise<RewindEditionRecord | null> {
	const day = toUtcDay(today);
	return findLatestEditionWhere({
		opensAt: { [Op.lte]: day },
		closesAt: { [Op.gte]: day }
	});
}

export function findLatestOpenedRewindEdition(
	today: Date
): Promise<RewindEditionRecord | null> {
	return findLatestEditionWhere({ opensAt: { [Op.lte]: toUtcDay(today) } });
}

export async function findRewindEditionByYear(
	year: number
): Promise<RewindEditionRecord | null> {
	const edition = await RewindEdition.findOne({
		attributes: REWIND_EDITION_ATTRS,
		where: { year }
	});
	return edition ? toEditionRecord(edition) : null;
}
