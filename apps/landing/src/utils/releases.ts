import { type CollectionEntry, getCollection } from "astro:content";

export type Release = CollectionEntry<"releases">;

export const RELEASES_PER_PAGE = 15;

export async function getReleasesNewestFirst(): Promise<Release[]> {
	const entries = await getCollection("releases");
	return [...entries].sort((a, b) => {
		if (a.data.date !== b.data.date)
			return a.data.date < b.data.date ? 1 : -1;
		return b.data.order - a.data.order;
	});
}
