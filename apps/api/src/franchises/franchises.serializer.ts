import { type Franchise } from "./franchise.model";

export function franchiseSummarySerializer(
	franchise: Franchise,
	{ gameCount, isTracked }: { gameCount: number; isTracked: boolean }
) {
	return {
		id: franchise.id,
		name: franchise.name,
		code: franchise.code,
		description: franchise.description ?? null,
		gameCount,
		isTracked,
		previewGames:
			franchise.Games?.map(game => ({
				id: game.id,
				code: game.code,
				title: game.title,
				backgroundUrl: game.backgroundUrl
			})) ?? []
	};
}
