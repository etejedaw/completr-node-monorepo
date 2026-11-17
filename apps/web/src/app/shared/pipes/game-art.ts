import { Pipe, type PipeTransform } from "@angular/core";

import { gameArtUrl } from "../utils/game-art";
import {
	type GameArtOrientation,
	type GameArtSource
} from "../utils/game-art.model";

@Pipe({ name: "gameArt" })
export class GameArtPipe implements PipeTransform {
	transform(
		game: GameArtSource | null | undefined,
		orientation: GameArtOrientation
	): string | null {
		return gameArtUrl(game, orientation);
	}
}
