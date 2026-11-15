import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../../core/models";
import { MoodTagsService } from "../../mood-tags/mood-tags";
import { injectGameMoodTags } from "./game-mood-tags";

const game = { id: "g1", userMoodTags: ["cozy"] } as Game;

describe("injectGameMoodTags", () => {
	const getMyTags = vi.fn();
	const replaceGameTags = vi.fn();

	function setup() {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: MoodTagsService,
					useValue: { getMyTags, replaceGameTags }
				}
			]
		});
		return TestBed.runInInjectionContext(() =>
			injectGameMoodTags(signal(game))
		);
	}

	beforeEach(() => {
		getMyTags
			.mockReset()
			.mockReturnValue(of([{ tag: "cozy" }, { tag: "tense" }]));
		replaceGameTags.mockReset().mockReturnValue(of(["tense"]));
	});

	it("shows the saved tags and loads the suggestions", () => {
		const flow = setup();

		flow.showFor(game);

		expect(flow.tags()).toEqual(["cozy"]);
		expect(flow.suggestions()).toEqual(["cozy", "tense"]);
		expect(flow.editing()).toBe(false);
	});

	it("saves once when Save is clicked repeatedly", () => {
		const pending = new Subject<string[]>();
		replaceGameTags.mockReturnValue(pending);
		const flow = setup();
		flow.showFor(game);
		flow.startEdit();

		flow.commit();
		flow.commit();
		flow.commit();

		expect(replaceGameTags).toHaveBeenCalledTimes(1);
	});

	it("stays in edit mode with the draft after a failed save", () => {
		replaceGameTags.mockReturnValue(throwError(() => ({ status: 500 })));
		const flow = setup();
		flow.showFor(game);
		flow.startEdit();
		flow.draft.set(["cozy", "weird"]);

		flow.commit();

		expect(flow.editing()).toBe(true);
		expect(flow.saving()).toBe(false);
		expect(flow.draft()).toEqual(["cozy", "weird"]);
		expect(flow.tags()).toEqual(["cozy"]);
	});

	it("keeps the newest suggestions when an older answer arrives last", () => {
		const older = new Subject<{ tag: string }[]>();
		getMyTags
			.mockReturnValueOnce(older)
			.mockReturnValueOnce(of([{ tag: "fresh" }]));
		const flow = setup();

		flow.showFor(game);
		flow.showFor(game);
		older.next([{ tag: "stale" }]);

		expect(flow.suggestions()).toEqual(["fresh"]);
	});
});
