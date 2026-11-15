import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { of, Subject, throwError } from "rxjs";

import { type Game } from "../../../core/models";
import { GamesService } from "../../../core/services/games";
import { ToastService } from "../../../core/services/toast";
import { injectGameCompilation } from "./game-compilation";

const parent = {
	id: "p1",
	title: "Bundle",
	compilationItems: []
} as unknown as Game;
const child = (id: string) => ({ id, title: id, code: id }) as Game;

describe("injectGameCompilation", () => {
	const setCompilationItems = vi.fn();
	const clearCompilation = vi.fn();
	const onChanged = vi.fn();
	const toast = { success: vi.fn() };

	function setup() {
		TestBed.configureTestingModule({
			providers: [
				{
					provide: GamesService,
					useValue: { setCompilationItems, clearCompilation }
				},
				{ provide: ToastService, useValue: toast }
			]
		});
		const flow = TestBed.runInInjectionContext(() =>
			injectGameCompilation(signal(parent), onChanged)
		);
		flow.openModal();
		return flow;
	}

	beforeEach(() => {
		setCompilationItems.mockReset().mockReturnValue(of([]));
		clearCompilation.mockReset().mockReturnValue(of(""));
		onChanged.mockReset();
		toast.success.mockReset();
	});

	it("opens with two empty link rows", () => {
		const flow = setup();

		expect(flow.rows()).toHaveLength(2);
		expect(flow.rows().every(row => row.mode === "link")).toBe(true);
	});

	it("rejects rows without a selected game", () => {
		const flow = setup();

		flow.submit();

		expect(flow.error()).toBe("All linked rows must have a selected game.");
		expect(setCompilationItems).not.toHaveBeenCalled();
	});

	it("rejects the same game linked twice", () => {
		const flow = setup();
		flow.pickRowGame(0, child("a"));
		flow.pickRowGame(1, child("a"));

		flow.submit();

		expect(flow.error()).toBe("Linked games must be unique.");
	});

	it("rejects linking the compilation to itself", () => {
		const flow = setup();
		flow.pickRowGame(0, child("p1"));
		flow.pickRowGame(1, child("a"));

		flow.submit();

		expect(flow.error()).toBe("A compilation can't contain itself.");
	});

	it("rejects created titles that collide after slugging", () => {
		const flow = setup();
		flow.setRowMode(0, "create");
		flow.setRowMode(1, "create");
		flow.updateRowTitle(0, "Café Quest");
		flow.updateRowTitle(1, "cafe  quest!");

		flow.submit();

		expect(flow.error()).toBe("Created titles must produce unique slugs.");
	});

	it("excludes the compilation and the other linked games from each picker", () => {
		const flow = setup();
		flow.pickRowGame(0, child("a"));

		const [first, second] = flow.rows();

		expect(flow.excludedIds().get(first!.id)).toEqual(["p1"]);
		expect(flow.excludedIds().get(second!.id)).toEqual(["p1", "a"]);
	});

	it("sends a single request on repeated saves", () => {
		setCompilationItems.mockReturnValue(new Subject());
		const flow = setup();
		flow.pickRowGame(0, child("a"));
		flow.pickRowGame(1, child("b"));

		flow.submit();
		flow.submit();

		expect(setCompilationItems).toHaveBeenCalledTimes(1);
	});

	it.each([
		[429, undefined, "Compilation was NOT saved"],
		[422, "GAME_UNIQUE_CONSTRAINT", "collides with an existing game code"],
		[404, "GAME_NOT_FOUND", "not found"],
		[500, undefined, "Failed to save compilation."]
	])(
		"explains a %s failure and keeps the dialog open",
		(status, type, text) => {
			setCompilationItems.mockReturnValue(
				throwError(() => ({ status, error: { type } }))
			);
			const flow = setup();
			flow.pickRowGame(0, child("a"));
			flow.pickRowGame(1, child("b"));

			flow.submit();

			expect(flow.error()).toContain(text);
			expect(flow.open()).toBe(true);
			expect(flow.saving()).toBe(false);
		}
	);

	it("reports the change after saving", () => {
		const flow = setup();
		flow.pickRowGame(0, child("a"));
		flow.pickRowGame(1, child("b"));

		flow.submit();

		expect(onChanged).toHaveBeenCalledTimes(1);
		expect(flow.open()).toBe(false);
	});

	it("can retry clearing after a failure", () => {
		clearCompilation.mockReturnValue(throwError(() => ({ status: 500 })));
		const flow = setup();

		flow.clear();
		flow.clear();

		expect(clearCompilation).toHaveBeenCalledTimes(2);
		expect(flow.error()).toBe("Failed to clear compilation.");
		expect(flow.clearing()).toBe(false);
	});

	it("keeps at least one row and at most fifty", () => {
		const flow = setup();

		flow.removeRow(0);
		flow.removeRow(0);
		expect(flow.rows()).toHaveLength(1);
		for (let i = 0; i < 60; i++) flow.addRow();
		expect(flow.rows()).toHaveLength(50);
	});
});
