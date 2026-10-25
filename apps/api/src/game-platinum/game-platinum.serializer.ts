import { type GamePlatinum } from "./game-platinum.model";

export function gamePlatinumSerializer(platinum: GamePlatinum) {
	return {
		id: platinum.id,
		backlogId: platinum.backlogId,
		platformId: platinum.platformId,
		platinumedAt: platinum.platinumedAt,
		notes: platinum.notes
	};
}

export function gamePlatinumPublicSerializer(platinum: GamePlatinum) {
	const { notes: _notes, ...publicPlatinum } =
		gamePlatinumSerializer(platinum);
	const isRunVisible = platinum.Backlog?.isPublic === true;
	return {
		...publicPlatinum,
		backlogId: isRunVisible ? platinum.backlogId : null
	};
}

export type SerializedGamePlatinum =
	| ReturnType<typeof gamePlatinumSerializer>
	| ReturnType<typeof gamePlatinumPublicSerializer>;
