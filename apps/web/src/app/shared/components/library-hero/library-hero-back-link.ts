import { type LibraryHeroBackLink } from "./library-hero.model";

export function profileBackLink(
	username: string,
	page = "profile"
): LibraryHeroBackLink {
	return { label: `@${username}'s ${page}`, link: ["/user", username] };
}
