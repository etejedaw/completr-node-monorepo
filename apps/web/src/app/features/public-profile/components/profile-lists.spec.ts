import "@testing-library/jest-dom/vitest";

import { signal } from "@angular/core";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
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
		expect(getUserLists).toHaveBeenCalledWith("ada");
		expect(getUserFollowingLists).toHaveBeenCalledWith("ada");
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

	it("collapses long groups to six lists and expands them on request", async () => {
		const user = userEvent.setup();
		getUserLists.mockReturnValue(of({ items: lists("Own", 8), total: 8 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(screen.getByText("Own list 6")).toBeInTheDocument();
		expect(screen.queryByText("Own list 7")).not.toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: /Show all lists/ })
		);

		expect(screen.getByText("Own list 8")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Show fewer/ })
		).toHaveAttribute("aria-expanded", "true");
	});

	it("collapses to three lists on mobile", async () => {
		isMobile.set(true);
		getUserLists.mockReturnValue(of({ items: lists("Own", 5), total: 5 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(screen.getByText("Own list 3")).toBeInTheDocument();
		expect(screen.queryByText("Own list 4")).not.toBeInTheDocument();
	});

	it("offers no expand button when every list fits", async () => {
		getUserLists.mockReturnValue(of({ items: lists("Own", 3), total: 3 }));
		await renderLists();

		await screen.findByText("Own list 1");
		expect(
			screen.queryByRole("button", { name: /Show all lists/ })
		).not.toBeInTheDocument();
	});
});
