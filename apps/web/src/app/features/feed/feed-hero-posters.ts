import { type LibraryHeroPoster } from "../../shared/components/library-hero/library-hero";
import { type ActivityTarget, type FeedActivity } from "./feed";

export function gamePosters(activities: FeedActivity[]): LibraryHeroPoster[] {
	const seenGameKeys = new Set<string>();
	const posters: LibraryHeroPoster[] = [];
	for (const activity of activities) {
		const game = activityGame(activity);
		if (!game?.backgroundUrl) continue;
		const gameKey = gameIdentity(game);
		if (seenGameKeys.has(gameKey)) continue;
		seenGameKeys.add(gameKey);
		posters.push({ src: game.backgroundUrl, title: game.name });
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
