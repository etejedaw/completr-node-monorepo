import { type RewindFreezeReport } from "../../rewind/rewind-freeze.interface";

function describeYears(years: number[]) {
	return years.length > 0 ? years.join(", ") : "none";
}

export function describeRewindFreezeReport(report: RewindFreezeReport) {
	if (!report.locked)
		return "Skipped: another rewind freeze run holds the lock";
	return `Closed editions: ${describeYears(report.closedEditions)}, Frozen editions: ${describeYears(report.frozenEditions)}, Rewinds frozen: ${report.frozen}, Pending AI recap: ${report.pending}, Failed: ${report.failed}`;
}
