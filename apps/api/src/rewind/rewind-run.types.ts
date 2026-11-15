import { type ClosedRewindRun } from "./rewind-run.interface";

export type RatedRun = ClosedRewindRun & { userRating: number };

export type ReleasedRun = ClosedRewindRun & { releaseYear: number };
