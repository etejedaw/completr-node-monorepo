import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";
import { Backlog } from "./backlog.model";

const RATIO_SCALE = 20;

function calculateRatio(score?: number, duration?: number) {
	if (!score || !duration) return undefined;
	return Math.round((score / duration) * RATIO_SCALE * 100) / 100;
}

export function backlogSerializer(
	backlogEntry: Backlog,
	review?: { content: string | null } | null
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
		hasReview: !!review,
		reviewContent: review?.content ?? null,
		game: gameSerializer(backlogEntry.Game),
		platform: platformSerializer(backlogEntry.Platform)
	};
}

export function backlogPublicSerializer(
	backlogEntry: Backlog,
	review?: { content: string | null; rating: number | null } | null
) {
	const full = backlogSerializer(backlogEntry, review);
	const { notes: _notes, ...publicEntry } = full;
	return {
		...publicEntry,
		review: review
			? { content: review.content, rating: review.rating }
			: null
	};
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
