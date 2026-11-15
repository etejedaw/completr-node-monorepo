import { type ScoreSource } from "./score-source.model";

export function scoreSourceSerializer(scoreSource: ScoreSource) {
	return {
		code: scoreSource.code,
		name: scoreSource.name,
		scale: scoreSource.scale,
		priority: scoreSource.priority
	};
}
