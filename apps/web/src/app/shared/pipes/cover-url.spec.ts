import { CoverUrlPipe } from "./cover-url";

const RAWG = "https://media.rawg.io/media/";

describe("CoverUrlPipe", () => {
	const pipe = new CoverUrlPipe();

	it("rewrites a RAWG media url to the resized path with width 420 by default", () => {
		expect(pipe.transform(`${RAWG}games/abc/cover.jpg`)).toBe(
			`${RAWG}resize/420/-/games/abc/cover.jpg`
		);
	});

	it.each([420, 640, 1280] as const)("uses the requested width %i", width => {
		expect(pipe.transform(`${RAWG}games/cover.jpg`, width)).toBe(
			`${RAWG}resize/${width}/-/games/cover.jpg`
		);
	});

	it.each(["resize/200/-/games/cover.jpg", "crop/600/400/games/cover.jpg"])(
		"keeps an already transformed url (%s)",
		path => {
			expect(pipe.transform(`${RAWG}${path}`, 640)).toBe(
				`${RAWG}${path}`
			);
		}
	);

	it.each([
		"https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg",
		"https://images.igdb.com/igdb/image/upload/t_1080p/sc5xyz.jpg"
	])("keeps an IGDB url untouched whatever the width (%s)", url => {
		expect(pipe.transform(url, 640)).toBe(url);
		expect(pipe.transform(url, 1280)).toBe(url);
	});

	it("returns external urls untouched", () => {
		expect(pipe.transform("https://example.com/cover.jpg")).toBe(
			"https://example.com/cover.jpg"
		);
	});

	it.each([null, undefined, ""])("returns an empty string for %j", value => {
		expect(pipe.transform(value)).toBe("");
	});
});
