import slugify from "slugify";

export function titleToSlug(title: string) {
	return slugify(title, {
		replacement: "-",
		lower: true,
		strict: true
	});
}
