export type GameReportCategory =
	"general" | "missing_score" | "missing_duration";

export interface GameReport {
	id: string;
	gameId: string;
	userId: string;
	message: string;
	category: GameReportCategory;
	status: "pending" | "approved" | "rejected";
	createdAt: string;
	updatedAt: string;
	Game: { id: string; title: string; code: string };
	User: { id: string; username: string };
}
