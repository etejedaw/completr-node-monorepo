import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import {
	ApplicationRef,
	ChangeDetectionStrategy,
	Component
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { type BacklogEntry, type QueueEntry } from "../../../core/models";
import { ToastContainer } from "../../../shared/components/toast-container/toast-container";
import { QueueView } from "./queue-view";

@Component({
	selector: "app-queue-host",
	imports: [QueueView, ToastContainer],
	template: `<app-queue-view /><app-toast-container />`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
class QueueHost {}

const api = environment.apiUrl;
const queueUrl = `${api}/users/me/queue`;

function run(id: string, code: string, title: string): BacklogEntry {
	return {
		id,
		status: "not_started",
		isPublic: true,
		score: 4,
		duration: 20,
		game: { id: `g-${id}`, code, title, isDlc: false },
		platform: { id: "p1", abbreviation: "PC" }
	};
}

const library = [
	run("b1", "hades", "Hades"),
	run("b2", "celeste", "Celeste"),
	run("b3", "hollow-knight", "Hollow Knight"),
	run("b4", "tunic", "Tunic")
];

describe("QueueView interaction", () => {
	let httpTesting: HttpTestingController;
	let queuedIds: string[];
	const reorders: string[][] = [];
	const statusUpdates: { id: string; body: unknown }[] = [];

	function queueEntries(): QueueEntry[] {
		return queuedIds.map((backlogId, index) => ({
			id: `q-${backlogId}`,
			position: index + 1,
			backlog: library.find(entry => entry.id === backlogId)!
		}));
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (url === `${api}/users/me/favorites/game-ids`)
			return req.flush({ data: { gameIds: [] } });
		if (method === "GET" && url === queueUrl)
			return req.flush({
				data: { queue: queueEntries(), total: queuedIds.length }
			});
		if (url === `${queueUrl}/backlog-ids`)
			return req.flush({ data: { backlogIds: queuedIds } });
		if (method === "PUT" && url === queueUrl) {
			reorders.push(body.backlogIds);
			queuedIds = body.backlogIds;
			return req.flush({ data: { queue: queueEntries() } });
		}
		if (method === "POST" && url === `${queueUrl}?source=backlog`) {
			queuedIds = [...queuedIds, body.id];
			return req.flush({ data: { queue: queueEntries().at(-1) } });
		}
		if (method === "GET" && url === `${api}/users/me/backlog`)
			return req.flush({
				data: {
					backlog: library.filter(
						entry => !queuedIds.includes(entry.id)
					),
					total: library.length
				}
			});
		const backlogMatch = url.match(/\/users\/me\/backlog\/([^/]+)$/);
		if (method === "PATCH" && backlogMatch) {
			statusUpdates.push({ id: backlogMatch[1], body });
			queuedIds = queuedIds.filter(id => id !== backlogMatch[1]);
			return req.flush({
				data: {
					backlog: { ...library[0], ...body },
					queueRemoved: true
				}
			});
		}
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting.match(() => true);
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	function upNext() {
		return within(screen.getByRole("article", { name: /./ }));
	}

	function queueOrder() {
		const featured = screen.queryAllByRole("article").map(card =>
			within(card)
				.queryAllByRole("link")
				.map(link => link.getAttribute("aria-label"))
				.find(Boolean)
		);
		const rows = screen
			.queryAllByRole("listitem")
			.filter(item => item.closest("ol"))
			.map(item =>
				within(item)
					.getAllByRole("link")
					.map(link => link.getAttribute("aria-label"))
					.find(Boolean)
			);
		return [...featured, ...rows];
	}

	function row(title: string) {
		const item = screen
			.getAllByRole("listitem")
			.find(
				candidate =>
					within(candidate).queryAllByRole("link", { name: title })
						.length > 0
			);
		return within(item as HTMLElement);
	}

	function toast(message: string) {
		return within(
			screen.getByText(message).closest("[ngpToast]") as HTMLElement
		);
	}

	function queueCount() {
		return screen.getByText(/in your queue/);
	}

	async function renderQueue() {
		const { fixture } = await render(QueueHost, {
			providers: [provideHttpClient(), provideHttpClientTesting()]
		});
		TestBed.inject(ApplicationRef).components.push(fixture.componentRef);
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hades", "Celeste", "Hollow Knight"])
		);
	}

	beforeEach(() => {
		localStorage.clear();
		queuedIds = ["b1", "b2", "b3"];
		reorders.length = 0;
		statusUpdates.length = 0;
		Element.prototype.getAnimations = () => [];
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn()
			}))
		);
	});

	afterEach(() => {
		answerPending();
		httpTesting.verify();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(Element.prototype, "getAnimations");
	});

	it("shows the next game first and the rest in order", async () => {
		await renderQueue();

		expect(screen.getByText(/games in your queue/)).toHaveTextContent(
			"3 games in your queue"
		);
		expect(
			upNext().getByRole("button", { name: "Move down" })
		).toBeEnabled();
		expect(
			row("Celeste").getByRole("button", { name: "Move up" })
		).toBeEnabled();
		expect(
			row("Hollow Knight").getByRole("button", { name: "Move down" })
		).toBeDisabled();
	});

	it("reorders with the arrows and moves a game to the top", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			row("Hollow Knight").getByRole("button", { name: "Move up" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hades", "Hollow Knight", "Celeste"])
		);
		expect(reorders).toEqual([["b1", "b3", "b2"]]);

		await user.click(upNext().getByRole("button", { name: "Move down" }));
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades", "Celeste"])
		);

		await user.click(
			row("Celeste").getByRole("button", { name: "Move to top" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Celeste", "Hollow Knight", "Hades"])
		);
		expect(reorders.at(-1)).toEqual(["b2", "b3", "b1"]);
	});

	it("removes a game with undo, then commits the removal", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			row("Celeste").getByRole("button", { name: "Remove from Up Next" })
		);
		expect(queueOrder()).toEqual(["Hades", "Hollow Knight"]);
		expect(
			await screen.findByText("Removed Celeste from queue")
		).toBeInTheDocument();
		expect(screen.getByText(/in your queue/)).toHaveTextContent(
			"2 games in your queue"
		);

		await user.click(screen.getByRole("button", { name: /Undo/ }));
		expect(queueOrder()).toEqual(["Hades", "Celeste", "Hollow Knight"]);
		expect(reorders).toEqual([]);

		await user.click(
			row("Celeste").getByRole("button", { name: "Remove from Up Next" })
		);
		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);

		await untilVisible(() => expect(reorders).toEqual([["b1", "b3"]]));
		expect(queueOrder()).toEqual(["Hades", "Hollow Knight"]);
	});

	it("keeps an undone removal on the server when the queue is reordered during the undo window", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			row("Celeste").getByRole("button", { name: "Remove from Up Next" })
		);
		await screen.findByText("Removed Celeste from queue");
		await user.click(
			row("Hollow Knight").getByRole("button", { name: "Move up" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades"])
		);
		expect(reorders).toEqual([["b3", "b1", "b2"]]);

		await user.click(screen.getByRole("button", { name: /Undo/ }));
		expect(queueOrder()).toEqual(["Hollow Knight", "Hades", "Celeste"]);
		expect(queueCount()).toHaveTextContent("3 games in your queue");
		answerPending();
		expect(reorders).toEqual([["b3", "b1", "b2"]]);
		expect(queuedIds).toEqual(["b3", "b1", "b2"]);
	});

	it("commits a removal after a reorder during the undo window and keeps the new order", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			row("Celeste").getByRole("button", { name: "Remove from Up Next" })
		);
		await user.click(
			row("Hollow Knight").getByRole("button", { name: "Move up" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades"])
		);
		expect(reorders).toEqual([["b3", "b1", "b2"]]);

		await user.click(
			await screen.findByRole("button", { name: "Dismiss" })
		);

		await untilVisible(() =>
			expect(reorders).toEqual([
				["b3", "b1", "b2"],
				["b3", "b1"]
			])
		);
		expect(queueOrder()).toEqual(["Hollow Knight", "Hades"]);
		expect(queueCount()).toHaveTextContent("2 games in your queue");
		expect(queuedIds).toEqual(["b3", "b1"]);
	});

	it("keeps two pending removals on the server until each one is committed", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			row("Celeste").getByRole("button", { name: "Remove from Up Next" })
		);
		await user.click(
			row("Hollow Knight").getByRole("button", {
				name: "Remove from Up Next"
			})
		);
		expect(queueOrder()).toEqual(["Hades"]);
		await screen.findByText("Removed Hollow Knight from queue");

		await user.click(
			toast("Removed Hollow Knight from queue").getByRole("button", {
				name: /Undo/
			})
		);
		expect(queueOrder()).toEqual(["Hades", "Hollow Knight"]);
		expect(reorders).toEqual([]);

		await user.click(
			row("Hollow Knight").getByRole("button", { name: "Move up" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Hollow Knight", "Hades"])
		);
		expect(reorders).toEqual([["b3", "b1", "b2"]]);

		await user.click(
			toast("Removed Celeste from queue").getByRole("button", {
				name: "Dismiss"
			})
		);
		await untilVisible(() =>
			expect(reorders).toEqual([
				["b3", "b1", "b2"],
				["b3", "b1"]
			])
		);
		expect(queueOrder()).toEqual(["Hollow Knight", "Hades"]);
		expect(queuedIds).toEqual(["b3", "b1"]);
	});

	it("starts playing the next game and takes it out of the queue", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			upNext().getByRole("button", { name: /Start playing/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Start playing Hades?"
		});
		const startedOn = within(dialog).getByLabelText("Started on");
		expect(startedOn).not.toHaveValue("");

		await user.clear(startedOn);
		await user.type(startedOn, "2026-10-01");
		await user.click(
			within(dialog).getByRole("button", { name: "Start playing" })
		);

		await untilVisible(() =>
			expect(queueOrder()).toEqual(["Celeste", "Hollow Knight"])
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(statusUpdates).toEqual([
			{ id: "b1", body: { status: "playing", startedAt: "2026-10-01" } }
		]);
	});

	it("adds an unstarted game from the library", async () => {
		const user = userEvent.setup();
		await renderQueue();

		await user.click(
			screen.getByRole("button", { name: /Add from library/ })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add to Up Next"
		});
		await untilVisible(() =>
			expect(
				within(dialog).getByRole("button", {
					name: "Add Tunic to Up Next"
				})
			).toBeEnabled()
		);

		await user.click(
			within(dialog).getByRole("button", { name: "Add Tunic to Up Next" })
		);

		await untilVisible(() =>
			expect(within(dialog).getByRole("status")).toHaveTextContent(
				"Nothing left to add"
			)
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Close Add to Up Next" })
		);
		await untilVisible(() =>
			expect(queueOrder()).toEqual([
				"Hades",
				"Celeste",
				"Hollow Knight",
				"Tunic"
			])
		);
	});
});
