import { ScoreSource } from "./score-source.model";
import { RegisterScoreSourceDto } from "./score-sources.schema";

export async function findAll() {
	return ScoreSource.findAll({ order: [["name", "ASC"]] });
}

export async function findByCode(code: string) {
	return ScoreSource.findOne({ where: { code } });
}

export async function create(dto: RegisterScoreSourceDto) {
	return ScoreSource.create(dto);
}
