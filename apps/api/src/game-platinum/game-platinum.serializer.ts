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

function platinumGameSerializer(game: GamePlatinum["Game"]) {
	if (!game) return undefined;
	return {
		id: game.id,
		code: game.code,
		title: game.title,
		backgroundUrl: game.backgroundUrl,
		isDlc: game.isDlc
	};
}

function platinumPlatformSerializer(platform: GamePlatinum["Platform"]) {
	if (!platform) return null;
	return {
		id: platform.id,
		name: platform.name,
		abbreviation: platform.abbreviation
	};
}

export function platinumEntrySerializer(
	platinum: GamePlatinum,
	isOwner: boolean
) {
	const details = isOwner
		? gamePlatinumSerializer(platinum)
		: gamePlatinumPublicSerializer(platinum);
	return {
		...details,
		platform: platinumPlatformSerializer(platinum.Platform),
		game: platinumGameSerializer(platinum.Game)
	};
}

export type SerializedGamePlatinum =
	| ReturnType<typeof gamePlatinumSerializer>
	| ReturnType<typeof gamePlatinumPublicSerializer>;
