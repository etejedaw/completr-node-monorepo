import { QueryTypes } from "sequelize";

import { sequelize } from "../../src/database/sequelize.database";
import { REWIND_FREEZE_LOCK_KEY } from "../../src/rewind/rewind.constants";
import { RewindEdition } from "../../src/rewind-editions/rewind-edition.model";
import { type RewindEditionRecord } from "../../src/rewind-editions/rewind-editions.interface";

export const CLOSED_YESTERDAY = {
	opensAt: "2026-11-01",
	closesAt: "2026-12-14",
	graceStartsAt: "2026-12-10",
	graceEndsAt: "2026-12-14"
};

export const CLOSED_TWO_WEEKS_AGO = {
	opensAt: "2026-11-01",
	closesAt: "2026-12-01",
	graceStartsAt: "2026-11-20",
	graceEndsAt: "2026-11-25"
};

export async function closeEdition(
	year: number,
	dates: Partial<RewindEditionRecord> = CLOSED_YESTERDAY
) {
	await RewindEdition.update(dates, { where: { year } });
}

export async function findEditionFrozenAt(year: number) {
	const edition = await RewindEdition.findOne({ where: { year } });
	return edition?.frozenAt ?? null;
}

export async function holdFreezeLockWhile<T>(work: () => Promise<T>) {
	return sequelize.transaction(async transaction => {
		await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
			replacements: { key: REWIND_FREEZE_LOCK_KEY },
			type: QueryTypes.SELECT,
			transaction
		});
		return work();
	});
}

export function deferred<T>() {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>(settle => {
		resolve = settle;
	});
	return { promise, resolve };
}
