import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import * as scoreSourcesServiceError from "./errors/score-sources.service-error";
import { ScoreSource } from "./score-source.model";
import { type RegisterScoreSourceDto } from "./score-sources.schema";

export async function findAll() {
	return ScoreSource.findAll({
		order: [
			["priority", "ASC"],
			["name", "ASC"]
		]
	});
}

export async function findByCode(code: string) {
	return ScoreSource.findOne({ where: { code } });
}

export async function findExistingCodes(codes: string[]): Promise<Set<string>> {
	if (codes.length === 0) return new Set();
	const sources = await ScoreSource.findAll({
		where: { code: codes },
		attributes: ["code"]
	});
	return new Set(sources.map(source => source.code));
}

export async function existsByCode(code: string): Promise<boolean> {
	return (await findExistingCodes([code])).has(code);
}

export async function create(dto: RegisterScoreSourceDto) {
	try {
		return await ScoreSource.create(dto);
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: scoreSourcesServiceError.uniqueConstraintError
		});
	}
}
