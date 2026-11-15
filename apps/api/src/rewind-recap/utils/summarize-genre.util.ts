import { type RewindGenre } from "../../rewind/rewind.interface";

export function summarizeGenre(genre: RewindGenre) {
	return { name: genre.name, count: genre.count };
}
