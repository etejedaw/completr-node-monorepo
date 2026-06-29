import { rethrowSequelizeError } from "../common/errors/sequelize-error.mapper";
import { Game } from "../games/game.model";
import * as gamesService from "../games/games.service";
import { User } from "../users/user.model";
import * as gameReportsServiceError from "./errors/game-reports.service-error";
import { GameReport, type ReportCategory } from "./game-report.model";

export async function createReport(
	gameId: string,
	userId: string,
	message: string,
	category: ReportCategory = "general"
) {
	const game = await gamesService.findGameById(gameId);
	if (!game) throw gameReportsServiceError.gameNotFoundError();

	try {
		return await GameReport.create({ gameId, userId, message, category });
	} catch (error) {
		rethrowSequelizeError(error, {
			unique: () => gameReportsServiceError.alreadyReportedError()
		});
	}
}

export async function findPendingReports() {
	return GameReport.findAll({
		where: { status: "pending" },
		include: [
			{ model: Game, attributes: ["id", "title", "code"] },
			{ model: User, attributes: ["id", "username"] }
		],
		order: [["createdAt", "ASC"]]
	});
}

export async function updateReportStatus(
	reportId: string,
	status: "approved" | "rejected"
) {
	const report = await GameReport.findOne({ where: { id: reportId } });
	if (!report) throw gameReportsServiceError.notFoundError();

	await report.update({ status });
	return report;
}
