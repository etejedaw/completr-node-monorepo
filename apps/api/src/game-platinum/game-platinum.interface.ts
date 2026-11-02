import { type GamePlatinum } from "./game-platinum.model";

export interface UpsertedGamePlatinum {
	platinum: GamePlatinum;
	created: boolean;
}
