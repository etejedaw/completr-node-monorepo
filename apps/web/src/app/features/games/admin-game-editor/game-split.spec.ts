import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { injectGameSplit } from "./game-split";

const game = { id: "g1", title: "Collection", variant: null } as Game;

describe("injectGameSplit", () => {
	const splitGame = vi.fn();
	const onSplit = vi.fn();
	const toast = { success: vi.fn() };

	function setup() {
		TestBed.configureTestingModule({
			providers: [
				{ provide: GamesService, useValue: { splitGame } },
				{ provide: ToastService, useValue: toast }
			]
		});
		const flow = TestBed.runInInjectionContext(() =>
			injectGameSplit(signal(game), onSplit)
		);
		flow.openModal();
		return flow;
	}

	function fillSecondVariant(flow: ReturnType<typeof setup>) {
		flow.updateVariantLabel(0, "PC");
		flow.updateVariantTitle(1, "Collection Switch");
		flow.updateVariantLabel(1, "Switch");
	}

	beforeEach(() => {
		splitGame.mockReset().mockReturnValue(of([{ id: "g2" }, { id: "g3" }]));
		onSplit.mockReset();
		toast.success.mockReset();
	});

	it("starts with the current game and an empty variant", () => {
		const flow = setup();

		expect(flow.open()).toBe(true);
		expect(flow.variants()).toEqual([
			{ title: "Collection", variant: "" },
			{ title: "", variant: "" }
		]);
	});

	it("sends a single request on repeated submits", () => {
		splitGame.mockReturnValue(new Subject());
		const flow = setup();
		fillSecondVariant(flow);

		flow.submit();
		flow.submit();

		expect(splitGame).toHaveBeenCalledTimes(1);
	});

	it.each([
		["blank labels", "", "All variants need a title and a variant label."],
		[
			"titles without letters",
			"!!!",
			"Variant titles need letters or numbers to build a slug."
		]
	])("rejects %s without calling the API", (_label, title, message) => {
		const flow = setup();
		flow.updateVariantLabel(0, "PC");
		flow.updateVariantTitle(1, title || "Other");
		flow.updateVariantLabel(1, title ? "Switch" : "");

		flow.submit();

		expect(flow.error()).toBe(message);
		expect(splitGame).not.toHaveBeenCalled();
	});

	it("rejects repeated labels ignoring case", () => {
		const flow = setup();
		fillSecondVariant(flow);
		flow.updateVariantLabel(1, "pc");

		flow.submit();

		expect(flow.error()).toBe("Variant labels must be unique.");
	});

	it("keeps the dialog open and explains a rate limit", () => {
		splitGame.mockReturnValue(throwError(() => ({ status: 429 })));
		const flow = setup();
		fillSecondVariant(flow);

		flow.submit();

		expect(flow.error()).toContain("Split was NOT applied");
		expect(flow.open()).toBe(true);
		expect(flow.splitting()).toBe(false);
	});

	it("cannot be closed while splitting", () => {
		splitGame.mockReturnValue(new Subject());
		const flow = setup();
		fillSecondVariant(flow);
		flow.submit();

		flow.closeModal();

		expect(flow.open()).toBe(true);
	});

	it("opens the first variant after a successful split", () => {
		const flow = setup();
		fillSecondVariant(flow);

		flow.submit();

		expect(onSplit).toHaveBeenCalledWith({ id: "g2" });
		expect(flow.open()).toBe(false);
	});

	it("never goes below two or above ten variants", () => {
		const flow = setup();

		flow.removeVariant(0);
		expect(flow.variants()).toHaveLength(2);
		for (let i = 0; i < 20; i++) flow.addVariant();
		expect(flow.variants()).toHaveLength(10);
	});
});
