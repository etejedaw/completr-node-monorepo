import { type GameScore } from "../game-scores/game-score.model";
import { type GameTime } from "../game-times/game-time.model";
import { type ScoreSource } from "../score-sources/score-source.model";

export type FrozenScoreContext = {
	scoresByGameId: Map<string, GameScore>;
	timesByGameId: Map<string, GameTime>;
	scoreSource: ScoreSource | null;
};
