import { Op, type WhereOptions } from "sequelize";

import { toUtcDay } from "../../common/utils/to-utc-day.util";
import { RewindEdition } from "../rewind-edition.model";
import { type RewindEditionRecord } from "../rewind-editions.interface";

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

export function toRewindEditionRecord(
	edition: RewindEdition
): RewindEditionRecord {
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
	return edition ? toRewindEditionRecord(edition) : null;
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

export async function findNextRewindEdition(
	today: Date
): Promise<RewindEditionRecord | null> {
	const edition = await RewindEdition.findOne({
		attributes: REWIND_EDITION_ATTRS,
		where: { opensAt: { [Op.gt]: toUtcDay(today) } },
		order: [
			["opensAt", "ASC"],
			["id", "ASC"]
		]
	});
	return edition ? toRewindEditionRecord(edition) : null;
}

export async function findRewindEditionByYear(
	year: number
): Promise<RewindEditionRecord | null> {
	const edition = await RewindEdition.findOne({
		attributes: REWIND_EDITION_ATTRS,
		where: { year }
	});
	return edition ? toRewindEditionRecord(edition) : null;
}

export async function findClosedUnfrozenRewindEditionYears(
	today: Date
): Promise<number[]> {
	const editions = await RewindEdition.findAll({
		attributes: ["year"],
		where: { closesAt: { [Op.lt]: toUtcDay(today) }, frozenAt: null },
		order: [
			["closesAt", "ASC"],
			["year", "ASC"]
		]
	});
	return editions.map(edition => edition.year);
}

export async function markRewindEditionsFrozen(
	years: number[],
	at: Date
): Promise<void> {
	await RewindEdition.update(
		{ frozenAt: at },
		{ where: { year: { [Op.in]: years }, frozenAt: null } }
	);
}
