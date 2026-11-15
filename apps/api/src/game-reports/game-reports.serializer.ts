import { type GameReport } from "./game-report.model";

export function gameReportSerializer(report: GameReport) {
	return {
		id: report.id,
		gameId: report.gameId,
		userId: report.userId,
		message: report.message,
		status: report.status,
		category: report.category,
		createdAt: report.createdAt,
		updatedAt: report.updatedAt
	};
}

export function pendingGameReportSerializer(report: GameReport) {
	return {
		...gameReportSerializer(report),
		Game: report.Game,
		User: report.User
	};
}
