import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import { of, Subject, throwError } from "rxjs";

import { ViewportService } from "../../../core/services/viewport";
import {
	type PublicList,
	PublicListsService
} from "../services/public-lists.service";
import { ProfileLists } from "./profile-lists";

function list(id: string, name: string): PublicList {
	return {
		id,
		name,
		scoreSource: "personal",
		durationSource: "personal",
		followerCount: 0,
		previewItems: []
	};
}

function lists(prefix: string, count: number) {
	return Array.from({ length: count }, (_, i) =>
		list(`${prefix}${i}`, `${prefix} list ${i + 1}`)
	);
}

describe("ProfileLists", () => {
	const isMobile = signal(false);
	const getUserLists = vi.fn();
	const getUserFollowingLists = vi.fn();

	function renderLists(inputs: Record<string, unknown> = {}) {
		return render(ProfileLists, {
			providers: [
				provideRouter([]),
				{
					provide: PublicListsService,
					useValue: { getUserLists, getUserFollowingLists }
				},
				{ provide: ViewportService, useValue: { isMobile } }
			],
			inputs: { username: "ada", ...inputs }
		});
	}

	beforeEach(() => {
		isMobile.set(false);
		getUserLists.mockReset().mockReturnValue(of({ items: [], total: 0 }));
		getUserFollowingLists
			.mockReset()
			.mockReturnValue(of({ items: [], total: 0 }));
	});

	it("loads the created and followed lists of the profile owner", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 2), total: 2 }));
		getUserFollowingLists.mockReturnValue(
			of({ items: lists("Followed", 1), total: 1 })
		);
		await renderLists();

		expect(await screen.findByText("Own list 1")).toBeInTheDocument();
		expect(screen.getByText("Followed list 1")).toBeInTheDocument();
		expect(getUserLists).toHaveBeenCalledWith("ada", { limit: 6 });
		expect(getUserFollowingLists).toHaveBeenCalledWith("ada", {
			limit: 6
		});
		expect(
			screen.getByRole("heading", { name: "Created 2" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Following 1" })
		).toBeInTheDocument();
	});

	it("omits the group that has no lists", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 1), total: 1 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(
			screen.queryByRole("heading", { name: /Following/ })
		).not.toBeInTheDocument();
	});

	it("renders nothing when the owner has no lists", async () => {
		const { container } = await renderLists();

		await waitFor(() =>
			expect(
				screen.queryByLabelText("Loading lists")
			).not.toBeInTheDocument()
		);
		expect(screen.queryByText("Lists")).not.toBeInTheDocument();
		expect(container.textContent?.trim()).toBe("");
	});

	it("still shows the other group when one request fails", async () => {
		getUserLists.mockReturnValue(throwError(() => ({ status: 403 })));
		getUserFollowingLists.mockReturnValue(
			of({ items: lists("Followed", 1), total: 1 })
		);
		await renderLists();

		expect(await screen.findByText("Followed list 1")).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /Created/ })
		).not.toBeInTheDocument();
	});

	it("shows a loading state while the lists load", async () => {
		getUserLists.mockReturnValue(new Subject());
		await renderLists();

		expect(screen.getByLabelText("Loading lists")).toBeInTheDocument();
	});

	it("shows six lists, counts the real total and links to the full page", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 6), total: 14 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(screen.getByText("Own list 6")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Created 14" })
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
			"href",
			"/user/ada/lists"
		);
		expect(
			screen.queryByRole("button", { name: /Show all lists|Show fewer/ })
		).not.toBeInTheDocument();
	});

	it("opens the Following tab when only the followed lists overflow", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 2), total: 2 }));
		getUserFollowingLists.mockReturnValue(
			of({ items: lists("Followed", 6), total: 9 })
		);
		await renderLists();

		await screen.findByText("Own list 1");
		expect(
			screen.getByRole("heading", { name: "Following 9" })
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
			"href",
			"/user/ada/lists?tab=following"
		);
	});

	it("shows three lists on mobile and links to the rest", async () => {
		isMobile.set(true);
		getUserLists.mockReturnValue(of({ items: lists("Own", 5), total: 5 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(screen.getByText("Own list 3")).toBeInTheDocument();
		expect(screen.queryByText("Own list 4")).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
			"href",
			"/user/ada/lists"
		);
	});

	it("offers no See all link when every list fits", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 3), total: 3 }));
		getUserFollowingLists.mockReturnValue(
			of({ items: lists("Followed", 6), total: 6 })
		);
		await renderLists();

		await screen.findByText("Own list 1");
		expect(
			screen.queryByRole("link", { name: /See all/ })
		).not.toBeInTheDocument();
	});

	it("loads again for a new username and drops the previous owner's lists", async () => {
		getUserLists.mockImplementation((username: string) =>
			of({ items: lists(username, 1), total: 1 })
		);
		const { fixture } = await renderLists();
		await screen.findByText("ada list 1");

		fixture.componentRef.setInput("username", "grace");

		expect(await screen.findByText("grace list 1")).toBeInTheDocument();
		expect(screen.queryByText("ada list 1")).not.toBeInTheDocument();
		expect(getUserLists).toHaveBeenLastCalledWith("grace", { limit: 6 });
	});
});
