import { type LibraryHeroPoster } from "../../shared/components/library-hero/library-hero.model";
import { gameArtUrl } from "../../shared/utils/game-art";
import { type ActivityTarget, type FeedActivity } from "./feed.model";

export function gamePosters(activities: FeedActivity[]): LibraryHeroPoster[] {
	const seenGameKeys = new Set<string>();
	const posters: LibraryHeroPoster[] = [];
	for (const activity of activities) {
		const game = activityGame(activity);
		const src = gameArtUrl(game, "portrait");
		if (!game || !src) continue;
		const gameKey = gameIdentity(game);
		if (seenGameKeys.has(gameKey)) continue;
		seenGameKeys.add(gameKey);
		posters.push({ src, title: game.name });
	}
	return posters;
}

function activityGame(activity: FeedActivity): ActivityTarget | null {
	if (activity.game) return activity.game;
	return activity.target?.type === "game" ? activity.target : null;
}

function gameIdentity(game: ActivityTarget): string {
	return game.id || game.code || game.name;
}
