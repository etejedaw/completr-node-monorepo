import "@testing-library/jest-dom/vitest";

import { provideRouter } from "@angular/router";
import { render, screen } from "@testing-library/angular";

import { type QueueEntry } from "../../../core/models/queue.model";
import { ProfileUpNext } from "./profile-up-next";

function entry(id: string, title: string, abbreviation?: string) {
	return {
		id,
		backlog: {
			id: `b-${id}`,
			ratio: 1.5,
			game: { id: `g-${id}`, code: id, title },
			platform: abbreviation ? { id: "p", abbreviation } : undefined
		}
	} as unknown as QueueEntry;
}

describe("ProfileUpNext", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});
	it("shows the queue in order with rank badges and a link to the full queue", async () => {
		await render(ProfileUpNext, {
			providers: [provideRouter([])],
			inputs: {
				username: "ada",
				entries: [
					entry("hades", "Hades", "PC"),
					entry("celeste", "Celeste")
				]
			}
		});

		expect(
			screen.getByRole("heading", { name: "Up Next" })
		).toBeInTheDocument();
		expect(screen.getByText("#1")).toBeInTheDocument();
		expect(screen.getByText("#2")).toBeInTheDocument();
		expect(screen.getAllByText("Hades").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Celeste").length).toBeGreaterThan(0);
		expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
			"href",
			"/user/ada/queue"
		);
	});

	it("renders nothing when the queue is empty", async () => {
		await render(ProfileUpNext, {
			providers: [provideRouter([])],
			inputs: { username: "ada", entries: [] }
		});

		expect(
			screen.queryByRole("heading", { name: "Up Next" })
		).not.toBeInTheDocument();
	});
});
