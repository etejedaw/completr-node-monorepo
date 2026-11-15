import { type RewindPremiumStats } from "../../rewind/rewind.interface";
import { collectYearRuns } from "../../rewind/utils/collect-year-runs.util";
import { listLatestFinishedRuns } from "../../rewind/utils/list-latest-finished-runs.util";
import { rankGenres } from "../../rewind/utils/rank-genres.util";
import { type RewindPremiumStatsInput } from "../rewind-recap.interface";
import { buildBacklogFlow } from "./build-backlog-flow.util";
import { buildHoursByMonth } from "./build-hours-by-month.util";
import { buildTasteVsCritics } from "./build-taste-vs-critics.util";

export function buildRewindPremiumStats(
	input: RewindPremiumStatsInput
): RewindPremiumStats {
	const { finished } = collectYearRuns(input.runs, input.year);
	const latestFinishedRuns = listLatestFinishedRuns(finished);

	return {
		hoursByMonth: buildHoursByMonth(finished),
		tasteVsCritics: buildTasteVsCritics(latestFinishedRuns),
		backlogFlow: buildBacklogFlow(finished, input.addedByMonth),
		genreShare: rankGenres(latestFinishedRuns, input.genres)
	};
}
