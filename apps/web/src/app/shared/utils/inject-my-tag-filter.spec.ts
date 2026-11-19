import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting
} from "@angular/common/http/testing";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { RouterTestingHarness } from "@angular/router/testing";

import { environment } from "../../../environments/environment";
import { type UserTag } from "../../core/services/mood-tags.model";
import { ToastService } from "../../core/services/toast";
import {
	urlMoodTags,
	userTag
} from "../components/my-tag-filter/my-tag-filter.testing";
import { injectMyTagFilter } from "./inject-my-tag-filter";

const myTagsUrl = `${environment.apiUrl}/users/me/mood-tags`;

@Component({
	selector: "app-tag-filter-page",
	template: "",
	changeDetection: ChangeDetectionStrategy.OnPush
})
class TagFilterPage {
	changes = 0;
	readonly filter = injectMyTagFilter({
		changed: () => this.changes++
	});
}

describe("injectMyTagFilter", () => {
	let httpTesting: HttpTestingController;
	let warning: ReturnType<typeof vi.fn>;

	async function openPage(url: string, tags: UserTag[] | "fail" = []) {
		const harness = await RouterTestingHarness.create();
		const page = await harness.navigateByUrl(url, TagFilterPage);
		httpTesting = TestBed.inject(HttpTestingController);
		const request = httpTesting.expectOne(myTagsUrl);
		if (tags === "fail")
			request.flush(null, { status: 500, statusText: "Server Error" });
		else request.flush({ data: { tags } });
		await harness.fixture.whenStable();
		return { harness, page };
	}

	function optionValues(page: TagFilterPage) {
		return page.filter.options().map(option => option.value);
	}

	beforeEach(() => {
		warning = vi.fn();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([{ path: "**", component: TagFilterPage }]),
				{ provide: ToastService, useValue: { warning } }
			]
		});
	});

	afterEach(() => httpTesting.verify());

	it("offers your tags most used first and stays hidden when you have none", async () => {
		const { page } = await openPage("/queue", [
			userTag("short", 1),
			userTag("cozy", 3)
		]);
		expect(optionValues(page)).toEqual(["cozy", "short"]);
		expect(page.filter.active()).toBe(false);
		expect(page.filter.param()).toBeUndefined();
	});

	it("offers nothing when you have no tags", async () => {
		const { page } = await openPage("/queue");

		expect(page.filter.options()).toEqual([]);
	});

	it("starts from the tags in the URL without asking the page to reload", async () => {
		const { page } = await openPage("/queue?mood_tags=cozy,short", [
			userTag("cozy", 3),
			userTag("short", 1)
		]);

		expect(page.filter.selected()).toEqual(["cozy", "short"]);
		expect(page.filter.param()).toBe("cozy,short");
		expect(page.changes).toBe(0);
		expect(urlMoodTags()).toBe("cozy,short");
	});

	it("cleans up garbage tags in the URL", async () => {
		const { page } = await openPage(
			`/queue?mood_tags=,, COZY ,cozy,,${"x".repeat(60)}&search=hk`,
			[userTag("cozy", 3)]
		);

		expect(page.filter.selected()).toEqual(["cozy"]);
		expect(urlMoodTags()).toBe("cozy");
		expect(TestBed.inject(Router).url).toContain("search=hk");
		expect(page.changes).toBe(0);
	});

	it("drops a URL that only had garbage", async () => {
		const { page } = await openPage("/queue?mood_tags=,,%20,", [
			userTag("cozy", 3)
		]);

		expect(page.filter.active()).toBe(false);
		expect(urlMoodTags()).toBeNull();
	});

	it("keeps a tag from the URL you no longer have so it can be removed", async () => {
		const { harness, page } = await openPage("/queue?mood_tags=gone");

		expect(optionValues(page)).toEqual(["gone"]);

		page.filter.select([]);
		await harness.fixture.whenStable();

		expect(page.filter.options()).toEqual([]);
		expect(page.changes).toBe(1);
	});

	it("writes the selection to the URL and asks the page to reload once per change", async () => {
		const { harness, page } = await openPage("/queue", [
			userTag("cozy", 3),
			userTag("short", 1)
		]);

		page.filter.select(["cozy"]);
		page.filter.select(["cozy", "short"]);
		await harness.fixture.whenStable();

		expect(page.changes).toBe(2);
		expect(urlMoodTags()).toBe("cozy,short");
	});

	it("ignores a selection equal to the current one", async () => {
		const { harness, page } = await openPage(
			"/queue?mood_tags=cozy,short",
			[userTag("cozy", 3), userTag("short", 1)]
		);

		page.filter.select(["short", "cozy"]);
		await harness.fixture.whenStable();

		expect(page.changes).toBe(0);
		expect(page.filter.selected()).toEqual(["cozy", "short"]);
	});

	it("refuses more than ten tags, warns and keeps the previous selection", async () => {
		const tags = Array.from({ length: 11 }, (_, index) =>
			userTag(`t${index + 1}`, 11 - index)
		);
		const ten = tags.slice(0, 10).map(tag => tag.tag);
		const { harness, page } = await openPage(
			`/queue?mood_tags=${ten.join(",")}`,
			tags
		);
		const before = page.filter.selected();

		page.filter.select([...ten, "t11"]);
		await harness.fixture.whenStable();

		expect(warning).toHaveBeenCalledWith(
			"You can filter by up to 10 tags at a time."
		);
		expect(page.filter.selected()).toEqual(ten);
		expect(page.filter.selected()).not.toBe(before);
		expect(page.changes).toBe(0);
		expect(urlMoodTags()).toBe(ten.join(","));
	});

	it("ends with the last choice after a rapid burst of selections", async () => {
		const { harness, page } = await openPage("/queue", [
			userTag("cozy", 3),
			userTag("short", 1)
		]);

		page.filter.select(["cozy"]);
		page.filter.select([]);
		page.filter.select(["short"]);
		page.filter.select(["short", "cozy"]);
		page.filter.select(["short"]);
		await harness.fixture.whenStable();

		expect(page.filter.selected()).toEqual(["short"]);
		expect(urlMoodTags()).toBe("short");
		expect(page.changes).toBe(5);
	});

	it("clears silently so the page can reload once with everything else", async () => {
		const { harness, page } = await openPage("/queue?mood_tags=cozy", [
			userTag("cozy", 3)
		]);

		page.filter.clearSilently();
		page.filter.clearSilently();
		await harness.fixture.whenStable();

		expect(page.filter.active()).toBe(false);
		expect(urlMoodTags()).toBeNull();
		expect(page.changes).toBe(0);
	});

	it("follows a navigation to the same page with other tags", async () => {
		const { harness, page } = await openPage("/queue?mood_tags=cozy", [
			userTag("cozy", 3),
			userTag("short", 1)
		]);

		await harness.navigateByUrl("/queue?mood_tags=short");
		expect(page.filter.selected()).toEqual(["short"]);
		expect(page.changes).toBe(1);

		await harness.navigateByUrl("/queue");
		expect(page.filter.active()).toBe(false);
		expect(page.changes).toBe(2);
	});

	it("still offers the URL tags when your tags fail to load", async () => {
		const { page } = await openPage("/queue?mood_tags=cozy", "fail");

		expect(optionValues(page)).toEqual(["cozy"]);
		expect(page.filter.param()).toBe("cozy");
	});
});
