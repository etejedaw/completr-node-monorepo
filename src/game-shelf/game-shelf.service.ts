import { RegisterGameshelfDto } from "./dtos/register-gameshelf.dto";
import { UpdateGameshelfDto } from "./dtos/update-gameshelf.dto";
import { GameShelf } from "./game-shelf.model";

export async function registerGameshelf(
	registerGameshelfDto: RegisterGameshelfDto
) {
	return GameShelf.create(registerGameshelfDto);
}

export async function findGameshelfById(id: string) {
	return await GameShelf.findOne({ where: { id } });
}

export async function findGameshelfsByUserId(userId: string) {
	return await GameShelf.findAll({ where: { userId } });
}

export async function updateGameshelf(
	id: string,
	updateGameshelfDto: UpdateGameshelfDto
) {
	const gameshelf = await findGameshelfById(id);
	if (!gameshelf) throw new Error("Gameshelf not found"); //TODO: Mejorar manejo de errores

	await gameshelf.update(updateGameshelfDto);
	return gameshelf;
}

export async function removeGameshelf(id: string) {
	await GameShelf.destroy({ where: { id } });
}
