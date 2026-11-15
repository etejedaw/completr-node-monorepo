import { type Genre } from "./genres.model";

export function genreSerializer(genre: Genre) {
	return { id: genre.id, name: genre.name, code: genre.code };
}
