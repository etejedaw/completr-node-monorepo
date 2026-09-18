import { calculateRatio } from "../common/utils/calculate-ratio.util";
import { type Game } from "../games/game.model";
import { type Platform } from "../platforms/platform.model";
import { type Backlog } from "./backlog.model";

export interface CoopMemberSummary {
	userId: string;
	username: string;
	name: string;
	avatarUrl: string | null;
	backlogId: string;
}

export function backlogSerializer(
	backlogEntry: Backlog,
	review?: { content: string | null; rating: number | null } | null,
	moodTags?: string[],
	latestProgress?: { note: string; createdAt: Date } | null,
	coopMembers?: CoopMemberSummary[]
) {
	return {
		id: backlogEntry.id,
		status: backlogEntry.status,
		score: backlogEntry.score,
		duration: backlogEntry.duration,
		ratio: calculateRatio(backlogEntry.score, backlogEntry.duration),
		personalRatio: calculateRatio(
			backlogEntry.score,
			backlogEntry.realDuration
		),
		startedAt: backlogEntry.startedAt,
		finishedAt: backlogEntry.finishedAt,
		realDuration: backlogEntry.realDuration,
		userRating: backlogEntry.userRating,
		isPublic: backlogEntry.isPublic,
		notes: backlogEntry.notes,
		hasReview: !!review?.content?.trim(),
		reviewContent: review?.content ?? null,
		review: review
			? { content: review.content, rating: review.rating }
			: null,
		moodTags: moodTags ?? [],
		latestProgress: latestProgress ?? null,
		coopRunId: backlogEntry.coopRunId ?? null,
		coopMembers: coopMembers ?? [],
		game: gameSerializer(backlogEntry.Game),
		platform: platformSerializer(backlogEntry.Platform),
		compilationGame: backlogEntry.CompilationGame
			? gameSummarySerializer(backlogEntry.CompilationGame)
			: null
	};
}

function gameSummarySerializer(game: Game) {
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl
	};
}

export function backlogPublicSerializer(
	backlogEntry: Backlog,
	review?: { content: string | null; rating: number | null } | null,
	moodTags?: string[],
	latestProgress?: { note: string; createdAt: Date } | null,
	coopMembers?: CoopMemberSummary[]
) {
	const full = backlogSerializer(
		backlogEntry,
		review,
		moodTags,
		latestProgress,
		coopMembers
	);
	const { notes: _notes, latestProgress: _lp, ...publicEntry } = full;
	return publicEntry;
}

function gameSerializer(game: Game) {
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}

function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		abbreviation: platform.abbreviation
	};
}
