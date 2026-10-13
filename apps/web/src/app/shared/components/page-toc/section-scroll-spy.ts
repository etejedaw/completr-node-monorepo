import {
	afterRenderEffect,
	DOCUMENT,
	inject,
	isSignal,
	type Signal,
	signal,
	untracked
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { type PageSection } from "./page-toc";

const PROGRAMMATIC_SCROLL_MS = 1000;

export function injectSectionScrollSpy(
	sections: readonly PageSection[] | Signal<readonly PageSection[]>
) {
	const route = inject(ActivatedRoute);
	const document = inject(DOCUMENT);
	const currentSections = isSignal(sections) ? sections : () => sections;
	const firstId = () => currentSections()[0]?.id ?? "";
	const lastId = () => currentSections().at(-1)?.id ?? "";

	const active = signal(firstId());
	let followScrollAfter = 0;
	let atPageEnd = false;
	let sectionInReadingBand = firstId();
	let fragmentHandled = false;

	const syncActiveWithScroll = () => {
		if (Date.now() < followScrollAfter) return;
		active.set(atPageEnd ? lastId() : sectionInReadingBand);
	};

	const scrollTo = (id: string, behavior?: ScrollBehavior) => {
		const target = document.getElementById(id);
		if (!target) return;
		const reduceMotion = document.defaultView?.matchMedia(
			"(prefers-reduced-motion: reduce)"
		).matches;
		followScrollAfter = Date.now() + PROGRAMMATIC_SCROLL_MS;
		target.scrollIntoView({
			behavior: behavior ?? (reduceMotion ? "auto" : "smooth"),
			block: "start"
		});
		active.set(id);
	};

	afterRenderEffect({
		mixedReadWrite: () => {
			if (fragmentHandled || currentSections().length === 0) return;
			fragmentHandled = true;
			untracked(() => {
				if (!active()) active.set(firstId());
				sectionInReadingBand ||= firstId();
				const fragment = route.snapshot.fragment;
				if (fragment) scrollTo(fragment, "auto");
			});
		}
	});

	return {
		active: active.asReadonly(),
		scrollTo,
		onSectionInView(id: string, inView: boolean) {
			if (inView) sectionInReadingBand = id;
			syncActiveWithScroll();
		},
		onEndInView(inView: boolean) {
			atPageEnd = inView;
			syncActiveWithScroll();
		}
	};
}
