import "@testing-library/jest-dom/vitest";

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
	type TestRequest
} from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { render, screen, waitFor, within } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";

import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth";
import { type UserTag } from "../../../core/services/mood-tags.model";
import { ToastService } from "../../../core/services/toast";
import TagsPage from "./tags-page";

const api = environment.apiUrl;

function userTag(tag: string, appearance: Partial<UserTag> = {}): UserTag {
	return {
		tag,
		usageCount: 2,
		description: null,
		favoriteOrder: null,
		icon: null,
		color: null,
		...appearance
	};
}

describe("Tags page icon and color", () => {
	let httpTesting: HttpTestingController;
	let fixture: ComponentFixture<TagsPage>;
	let myTags: UserTag[];
	let patches: { tag: string; body: Record<string, unknown> }[];
	let posts: Record<string, unknown>[];
	let heldPatches: TestRequest[];
	let holdPatches: boolean;
	let failNextPatch: number | null;
	let toast: {
		error: ReturnType<typeof vi.fn<(message: string) => void>>;
		success: ReturnType<typeof vi.fn<(message: string) => void>>;
	};

	function savePatch(req: TestRequest) {
		const tag = decodeURIComponent(req.request.url.split("/").at(-1)!);
		const body = req.request.body as Partial<UserTag> & {
			newTag?: string;
		};
		myTags = myTags.map(item =>
			item.tag === tag
				? {
						...item,
						tag: body.newTag ?? item.tag,
						icon: body.icon === undefined ? item.icon : body.icon,
						color:
							body.color === undefined ? item.color : body.color
					}
				: item
		);
		req.flush({ data: { tag: body.newTag ?? tag } });
	}

	function answer(req: TestRequest) {
		const { method, url, body } = req.request;
		if (method === "GET" && url === `${api}/users/me/mood-tags`)
			return req.flush({ data: { tags: myTags } });
		if (
			method === "PATCH" &&
			url.startsWith(`${api}/users/me/mood-tags/`)
		) {
			patches.push({
				tag: decodeURIComponent(url.split("/").at(-1)!),
				body: { ...body }
			});
			if (failNextPatch !== null) {
				const status = failNextPatch;
				failNextPatch = null;
				return req.flush(
					{ title: "Couldn't reach the server." },
					{ status, statusText: "Error" }
				);
			}
			if (holdPatches) {
				heldPatches.push(req);
				return;
			}
			return savePatch(req);
		}
		if (method === "POST" && url === `${api}/users/me/mood-tags`) {
			posts.push({ ...body });
			myTags = [...myTags, userTag(body.tag, { ...body, usageCount: 0 })];
			return req.flush({ data: body });
		}
		if (url === `${api}/tags/popular`)
			return req.flush({ data: { tags: [] } });
		if (url === `${api}/users/me/backlog`)
			return req.flush({ data: { backlog: [], total: 0 } });
		throw new Error(`Unexpected request: ${method} ${url}`);
	}

	function answerPending() {
		for (let round = 0; round < 10; round++) {
			const pending = httpTesting
				.match(() => true)
				.filter(req => !req.cancelled && !heldPatches.includes(req));
			if (pending.length === 0) return;
			pending.forEach(answer);
		}
	}

	async function respond() {
		answerPending();
		await fixture.whenStable();
	}

	async function untilVisible(assertion: () => void) {
		await waitFor(() => {
			answerPending();
			assertion();
		});
	}

	async function renderPage() {
		const view = await render(TagsPage, {
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: ToastService, useValue: toast },
				{
					provide: AuthService,
					useValue: {
						isPremium: signal(false),
						hasPremiumFeature: () => false
					}
				}
			]
		});
		fixture = view.fixture;
		httpTesting = TestBed.inject(HttpTestingController);
		await untilVisible(() =>
			expect(
				screen.getByRole("link", { name: "cozy" })
			).toBeInTheDocument()
		);
	}

	const rowIcon = (tag: string) =>
		screen
			.getByRole("link", { name: tag })
			.querySelector("app-tag-icon") as HTMLElement;
	const editor = (tag: string) =>
		screen.getByRole("form", { name: `Edit ${tag}` });
	const pick = async (
		user: ReturnType<typeof userEvent.setup>,
		container: HTMLElement,
		group: "Icon" | "Color",
		name: string
	) =>
		user.click(
			within(
				within(container).getByRole("group", {
					name: new RegExp(`^${group}`)
				})
			).getByRole("button", { name })
		);

	beforeEach(() => {
		myTags = [
			userTag("cozy", { icon: "bolt", color: "rose", favoriteOrder: 0 }),
			userTag("short")
		];
		patches = [];
		posts = [];
		heldPatches = [];
		holdPatches = false;
		failNextPatch = null;
		toast = { error: vi.fn(), success: vi.fn() };
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
		vi.unstubAllGlobals();
		heldPatches.forEach(req => req.flush({ data: { tag: "x" } }));
		heldPatches = [];
		answerPending();
		httpTesting.verify();
	});

	it("shows each tag with its icon and color in the list and in favorites", async () => {
		await renderPage();

		expect(rowIcon("cozy")).toHaveTextContent("bolt");
		expect(rowIcon("cozy").style.color).toBe("var(--color-view-rose)");
		expect(rowIcon("short")).toHaveTextContent("label");
		expect(rowIcon("short").style.color).toBe("var(--color-brand)");

		const favorite = within(
			screen.getByRole("region", { name: "Favorite tags" })
		).getByRole("listitem");
		const favoriteIcon = favorite.querySelector("app-tag-icon");
		expect(favoriteIcon).toHaveTextContent("bolt");
		expect((favoriteIcon as HTMLElement).style.color).toBe(
			"var(--color-view-rose)"
		);
	});

	it("sends only the icon and color when nothing else changed and shows them after saving", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(screen.getByRole("button", { name: "Edit short" }));
		await pick(user, editor("short"), "Icon", "Star");
		await pick(user, editor("short"), "Color", "Pink");
		await pick(user, editor("short"), "Color", "Green");
		await user.click(
			within(editor("short")).getByRole("button", { name: "Save" })
		);
		await respond();

		expect(patches).toEqual([
			{ tag: "short", body: { icon: "star", color: "emerald" } }
		]);
		await untilVisible(() => {
			expect(rowIcon("short")).toHaveTextContent("star");
			expect(rowIcon("short").style.color).toBe(
				"var(--color-view-emerald)"
			);
		});
		expect(toast.success).toHaveBeenCalledWith("Tag updated.");
	});

	it("clears the icon and color by sending null", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(screen.getByRole("button", { name: "Edit cozy" }));
		await pick(user, editor("cozy"), "Icon", "Default icon");
		await pick(user, editor("cozy"), "Color", "No color");
		await user.click(
			within(editor("cozy")).getByRole("button", { name: "Save" })
		);
		await respond();

		expect(patches).toEqual([
			{ tag: "cozy", body: { icon: null, color: null } }
		]);
		await untilVisible(() =>
			expect(rowIcon("cozy")).toHaveTextContent("label")
		);
	});

	it("sends a single update when Save is double clicked", async () => {
		const user = userEvent.setup();
		holdPatches = true;
		await renderPage();

		await user.click(screen.getByRole("button", { name: "Edit short" }));
		await pick(user, editor("short"), "Icon", "Trophy");
		await user.dblClick(
			within(editor("short")).getByRole("button", { name: "Save" })
		);
		await user.keyboard("{Enter}");
		await respond();

		expect(patches).toHaveLength(1);
		savePatch(heldPatches.shift()!);
		await untilVisible(() =>
			expect(rowIcon("short")).toHaveTextContent("emoji_events")
		);
		expect(patches).toHaveLength(1);
	});

	it("keeps the old look when the API fails and the user gives up", async () => {
		const user = userEvent.setup();
		failNextPatch = 500;
		await renderPage();

		await user.click(screen.getByRole("button", { name: "Edit cozy" }));
		await pick(user, editor("cozy"), "Icon", "Rocket");
		await pick(user, editor("cozy"), "Color", "Teal");
		await user.click(
			within(editor("cozy")).getByRole("button", { name: "Save" })
		);
		await respond();

		expect(toast.error).toHaveBeenCalledWith("Couldn't reach the server.");
		expect(
			within(
				within(editor("cozy")).getByRole("group", { name: /^Icon/ })
			).getByRole("button", { name: "Rocket" })
		).toHaveAttribute("aria-pressed", "true");

		await user.click(
			within(editor("cozy")).getByRole("button", { name: "Cancel" })
		);

		expect(rowIcon("cozy")).toHaveTextContent("bolt");
		expect(rowIcon("cozy").style.color).toBe("var(--color-view-rose)");

		await user.click(screen.getByRole("button", { name: "Edit cozy" }));
		expect(
			within(
				within(editor("cozy")).getByRole("group", { name: /^Icon/ })
			).getByRole("button", { name: "Bolt" })
		).toHaveAttribute("aria-pressed", "true");
		expect(myTags.find(item => item.tag === "cozy")).toMatchObject({
			icon: "bolt",
			color: "rose"
		});
	});

	it("does not send anything when the user changes the icon back and forth and ends where it started", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(screen.getByRole("button", { name: "Edit cozy" }));
		await pick(user, editor("cozy"), "Icon", "Star");
		await pick(user, editor("cozy"), "Icon", "Bolt");
		await pick(user, editor("cozy"), "Color", "Purple");
		await pick(user, editor("cozy"), "Color", "Pink");
		await user.click(
			within(editor("cozy")).getByRole("button", { name: "Save" })
		);
		await respond();

		expect(patches).toEqual([]);
		expect(
			screen.queryByRole("form", { name: "Edit cozy" })
		).not.toBeInTheDocument();
	});

	it("creates a tag with an icon and color and lists it with them", async () => {
		const user = userEvent.setup();
		await renderPage();

		await user.click(screen.getAllByRole("button", { name: "New tag" })[0]);
		const dialog = await screen.findByRole("dialog", { name: "New tag" });
		await user.type(within(dialog).getByLabelText("Name"), "co-op");
		await pick(user, dialog, "Icon", "Gamepad");
		await pick(user, dialog, "Color", "Purple");
		await user.click(
			within(dialog).getByRole("button", { name: "Create" })
		);
		await respond();

		expect(posts).toEqual([
			{
				tag: "co-op",
				description: null,
				icon: "sports_esports",
				color: "purple"
			}
		]);
		await untilVisible(() => {
			expect(rowIcon("co-op")).toHaveTextContent("sports_esports");
			expect(rowIcon("co-op").style.color).toBe(
				"var(--color-view-purple)"
			);
		});
	});
});
