import { Playthrough } from "./playthrough.model";

export async function findCompletedByUserAndGame(
	userId: string,
	gameId: string
) {
	return Playthrough.findOne({
		where: { userId, gameId, status: "completed" },
		order: [["finishedAt", "ASC"]]
	});
}
