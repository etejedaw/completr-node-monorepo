export const REWIND_FREEZE_SCHEDULE = "*/10 * * * *";
export const REWIND_FREEZE_SCHEDULER_NAME = "rewind-freeze";

export const JOB_TYPES = {
	populateRawg: "populate_rawg",
	populateExternalData: "populate_external_data",
	calculateRatings: "calculate_ratings",
	calculateDurations: "calculate_durations",
	recomputePopularity: "recompute_popularity",
	cleanupCoopRuns: "cleanup_coop_runs",
	rewindFreeze: "rewind_freeze"
} as const;

export const ACTIVE_JOB_STATUSES = ["pending", "running"];

export const JOBS_LIST_LIMIT = 20;

export const MIN_COMMUNITY_SAMPLE_RATIO = 0.1;

export const MIN_COMMUNITY_SAMPLE_SIZE = 2;

export const RAWG_POPULATE_REQUEST_INTERVAL_MS = 1100;

export const MAX_CONSECUTIVE_TRANSIENT_FAILURES = 3;

export const INTERRUPTED_JOB_RESULT =
	"Interrupted: the API restarted before the job finished";

export const TALLY_KEY_BY_STATUS = {
	updated: "updated",
	not_found: "notFound",
	ambiguous: "ambiguous",
	no_data: "noData",
	failed: "failed"
} as const;
export const COMMUNITY_AGGREGATION_BATCH_SIZE = 500;
