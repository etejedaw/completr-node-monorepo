import * as gamesService from "../../games/games.service";
import * as platformsService from "../../platforms/platforms.service";
import { BACKLOG_GAME_ATTRS, BACKLOG_PLATFORM_ATTRS } from "../backlog.constants";

export function buildBacklogInclude() {
	return [
		gamesService.gameInclude({ attributes: BACKLOG_GAME_ATTRS }),
		platformsService.platformInclude({ attributes: BACKLOG_PLATFORM_ATTRS }),
		gamesService.gameInclude({
			as: "CompilationGame",
			attributes: BACKLOG_GAME_ATTRS,
			required: false
		})
	];
}
