import { TestBed } from "@angular/core/testing";

import {
	type RewindFinishedGame,
	type RewindRatedGame
} from "../../../../../core/models/rewind.model";
import {
	REWIND_2026_FAN_LIMIT,
	Rewind2026CoverFan,
	rewind2026FanPosters,
	rewind2026FanReach,
	selectRewind2026FanGames
} from "./rewind-2026-cover-fan";
import { type Rewind2026FanSource } from "./rewind-2026-cover-fan.model";

function finished(
	id: string,
	coverUrl: string | null,
	backgroundUrl: string | null = null
): RewindFinishedGame {
	return {
		gameId: id,
		code: id,
		title: id,
		coverUrl,
		backgroundUrl,
		finishedAt: "2026-03-01",
		platformAbbreviation: null
	};
}

function topRated(id: string, coverUrl: string | null): RewindRatedGame {
	return { ...finished(id, coverUrl), userRating: 5 };
}

function source(
	games: RewindFinishedGame[],
	top: RewindRatedGame | null = null
): Rewind2026FanSource {
	return { highlights: { topRated: top }, finishedGames: games };
}

const ids = (games: { gameId: string }[]) => games.map(game => game.gameId);

describe("selectRewind2026FanGames", () => {
	it("puts the top rated game first and then the latest finished ones", () => {
		const picked = selectRewind2026FanGames(
			source(
				[finished("a", "a.jpg"), finished("b", "b.jpg")],
				topRated("t", "t.jpg")
			)
		);

		expect(ids(picked)).toEqual(["t", "b", "a"]);
	});

	it("keeps only the first appearance of a game that is also the top rated one", () => {
		const picked = selectRewind2026FanGames(
			source(
				[finished("a", "a.jpg"), finished("t", "t.jpg")],
				topRated("t", "t.jpg")
			)
		);

		expect(ids(picked)).toEqual(["t", "a"]);
	});

	it("drops games that share a poster with a game already picked", () => {
		const picked = selectRewind2026FanGames(
			source([
				finished("a", "same.jpg"),
				finished("b", "same.jpg"),
				finished("c", "c.jpg")
			])
		);

		expect(ids(picked)).toEqual(["c", "b"]);
	});

	it("repeated finishes of one game count once", () => {
		const picked = selectRewind2026FanGames(
			source([
				finished("a", "a1.jpg"),
				finished("a", "a2.jpg"),
				finished("b", "b.jpg")
			])
		);

		expect(ids(picked)).toEqual(["b", "a"]);
	});

	it("lists games with a cover before games that only have a background", () => {
		const picked = selectRewind2026FanGames(
			source([
				finished("cover-old", "old.jpg"),
				finished("bg-new", null, "bg-new.jpg"),
				finished("cover-new", "new.jpg")
			])
		);

		expect(ids(picked)).toEqual(["cover-new", "cover-old", "bg-new"]);
	});

	it("leaves out games with no art at all, blank art included", () => {
		const picked = selectRewind2026FanGames(
			source([
				finished("none", null, null),
				finished("blank", "  ", " "),
				finished("ok", "ok.jpg")
			])
		);

		expect(ids(picked)).toEqual(["ok"]);
	});

	it("shows at most five posters", () => {
		const games = Array.from({ length: 12 }, (_, index) =>
			finished(`g${index}`, `g${index}.jpg`)
		);

		const picked = selectRewind2026FanGames(source(games));

		expect(picked).toHaveLength(REWIND_2026_FAN_LIMIT);
		expect(ids(picked)).toEqual(["g11", "g10", "g9", "g8", "g7"]);
	});

	it("returns nothing when there is nothing to show", () => {
		expect(selectRewind2026FanGames(source([]))).toEqual([]);
		expect(
			selectRewind2026FanGames(source([], topRated("t", null)))
		).toEqual([]);
	});
});

describe("rewind2026FanPosters", () => {
	it("puts the first game in the middle, in front and the biggest", () => {
		const posters = rewind2026FanPosters(
			["a", "b", "c", "d", "e"].map(id => finished(id, `${id}.jpg`))
		);

		const middle = posters.find(poster => poster.offset === 0);
		expect(middle?.gameId).toBe("a");
		expect(middle?.size).toBe(1);
		expect(middle?.layer).toBe(Math.max(...posters.map(p => p.layer)));
	});

	it("spreads the others outward one step each, smaller and further back", () => {
		const posters = rewind2026FanPosters(
			["a", "b", "c", "d", "e"].map(id => finished(id, `${id}.jpg`))
		);

		expect(posters.map(poster => poster.offset)).toEqual([0, -1, 1, -2, 2]);
		expect(posters.map(poster => poster.depth)).toEqual([0, 1, 1, 2, 2]);
		expect(posters.map(poster => poster.layer)).toEqual([5, 4, 3, 2, 1]);
		for (const poster of posters.slice(1))
			expect(poster.size).toBeLessThan(1);
	});

	it("keeps a short fan centred", () => {
		expect(
			rewind2026FanPosters([finished("a", "a.jpg")]).map(p => p.offset)
		).toEqual([0]);
		expect(
			rewind2026FanPosters([
				finished("a", "a.jpg"),
				finished("b", "b.jpg")
			]).map(poster => poster.offset)
		).toEqual([-0.5, 0.5]);
	});
});

describe("a sparse fan", () => {
	it("stands a single poster in the middle as the lead, full size and undimmed", () => {
		const [poster] = rewind2026FanPosters([finished("a", "a.jpg")]);

		expect(poster).toMatchObject({
			offset: 0,
			depth: 0,
			size: 1,
			isLead: true
		});
	});

	it("keeps a pair centred and still lights the first one as the lead", () => {
		const posters = rewind2026FanPosters([
			finished("a", "a.jpg"),
			finished("b", "b.jpg")
		]);

		expect(posters.reduce((sum, poster) => sum + poster.offset, 0)).toBe(0);
		expect(posters.map(poster => poster.isLead)).toEqual([true, false]);
		expect(posters[0]).toMatchObject({ depth: 0, size: 1, layer: 2 });
		expect(posters[1].depth).toBe(0.5);
		expect(posters[1].size).toBeLessThan(1);
		expect(posters[1].layer).toBe(1);
	});

	it("measures how far the fan reaches from the middle so the floor fits it", () => {
		const fan = (count: number) =>
			rewind2026FanPosters(
				Array.from({ length: count }, (_, index) =>
					finished(`g${index}`, `g${index}.jpg`)
				)
			);

		expect(rewind2026FanReach([])).toBe(0);
		expect(rewind2026FanReach(fan(1))).toBe(0);
		expect(rewind2026FanReach(fan(2))).toBe(0.5);
		expect(rewind2026FanReach(fan(3))).toBe(1);
		expect(rewind2026FanReach(fan(5))).toBe(2);
	});

	it("leads with only one poster when the only finished game is also the top rated, finished twice", () => {
		const picked = selectRewind2026FanGames(
			source(
				[finished("t", "t.jpg"), finished("t", "t.jpg")],
				topRated("t", "t.jpg")
			)
		);

		expect(ids(picked)).toEqual(["t"]);
		expect(rewind2026FanPosters(picked)[0].isLead).toBe(true);
	});
});

describe("Rewind2026CoverFan", () => {
	function render(input: Rewind2026FanSource) {
		const fixture = TestBed.createComponent(Rewind2026CoverFan);
		fixture.componentRef.setInput("rewind", input);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it("draws one decorative poster per picked game", () => {
		const element = render(
			source(
				[finished("a", "a.jpg"), finished("b", "b.jpg")],
				topRated("t", "t.jpg")
			)
		);

		const images = [...element.querySelectorAll("img")];
		expect(images.map(image => image.getAttribute("src"))).toEqual([
			"t.jpg",
			"b.jpg",
			"a.jpg"
		]);
		for (const image of images) expect(image.getAttribute("alt")).toBe("");
		expect(element.querySelector("[aria-hidden='true']")).not.toBeNull();
		expect(element.querySelectorAll("a, button, [tabindex]")).toHaveLength(
			0
		);
	});

	it("lights the middle poster on a stage and dims the ones further back", () => {
		const element = render(
			source(
				["a", "b", "c", "d"].map(id => finished(id, `${id}.jpg`)),
				topRated("t", "t.jpg")
			)
		);

		expect(element.querySelector("[data-fan-halo]")).not.toBeNull();
		expect(element.querySelector("[data-fan-floor]")).not.toBeNull();
		const images = [...element.querySelectorAll<HTMLElement>("img")];
		const depths = images.map(image =>
			image.style.getPropertyValue("--poster-depth")
		);
		expect(depths).toEqual(["0", "1", "1", "2", "2"]);
		expect(images[0].className).toContain("border-white/20");
		for (const image of images.slice(1)) {
			expect(image.className).toContain("border-white/10");
			expect(image.className).not.toContain("border-white/20");
		}
		for (const image of images)
			expect(image.className).toContain("brightness-");
	});

	it("stages a single poster in the middle with its halo, floor and reflection", () => {
		const element = render(source([finished("a", "a.jpg")]));

		const images = [...element.querySelectorAll<HTMLElement>("img")];
		expect(images).toHaveLength(1);
		expect(images[0].className).toContain("border-white/20");
		expect(images[0].className).toContain("-webkit-box-reflect");
		expect(images[0].style.getPropertyValue("--poster-offset")).toBe("0");
		expect(element.querySelector("[data-fan-halo]")).not.toBeNull();
		const stage = element.querySelector<HTMLElement>(
			"[aria-hidden='true']"
		)!;
		expect(stage.style.getPropertyValue("--fan-reach")).toBe("0");
		const floor = element.querySelector("[data-fan-floor]")!;
		expect(floor.className).toContain("var(--fan-reach)");
		expect(floor.className).toContain("left-1/2");
		expect(floor.className).not.toContain("inset-x-");
	});

	it("lights the lead of a pair even though neither poster sits in the middle", () => {
		const element = render(
			source([finished("a", "a.jpg")], topRated("t", "t.jpg"))
		);

		const images = [...element.querySelectorAll<HTMLElement>("img")];
		expect(images.map(image => image.getAttribute("src"))).toEqual([
			"t.jpg",
			"a.jpg"
		]);
		expect(images[0].className).toContain("border-white/20");
		expect(images[1].className).toContain("border-white/10");
		expect(images[1].className).not.toContain("border-white/20");
		expect(
			images.map(image => image.style.getPropertyValue("--poster-depth"))
		).toEqual(["0", "0.5"]);
		const stage = element.querySelector<HTMLElement>(
			"[aria-hidden='true']"
		)!;
		expect(stage.style.getPropertyValue("--fan-reach")).toBe("0.5");
	});

	it("draws nothing when no game has art", () => {
		const element = render(source([finished("a", null, null)]));

		expect(element.querySelector("img")).toBeNull();
		expect(element.textContent?.trim()).toBe("");
	});

	it("follows the data when the Rewind changes under it", () => {
		const fixture = TestBed.createComponent(Rewind2026CoverFan);
		fixture.componentRef.setInput(
			"rewind",
			source([finished("a", "a.jpg")])
		);
		fixture.detectChanges();
		const element = fixture.nativeElement as HTMLElement;
		expect(element.querySelectorAll("img")).toHaveLength(1);

		fixture.componentRef.setInput("rewind", source([]));
		fixture.detectChanges();
		expect(element.querySelectorAll("img")).toHaveLength(0);

		fixture.componentRef.setInput(
			"rewind",
			source([finished("a", "a.jpg"), finished("b", "b.jpg")])
		);
		fixture.detectChanges();
		expect(element.querySelectorAll("img")).toHaveLength(2);
	});
});
