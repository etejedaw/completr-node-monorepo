import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	linkedSignal,
	output,
	untracked
} from "@angular/core";

import { type Game } from "../../../core/models";
import { FilterSection } from "../../../shared/components/filter-section/filter-section";
import {
	UiAlert,
	UiBadge,
	UiButton,
	UiCheckbox,
	UiDialog,
	UiEyebrow
} from "../../../shared/ui";
import {
	type ExternalDataRefreshResult,
	type ExternalDataSource
} from "../../games/games.model";
import {
	type ExternalDataRefreshState,
	type ExternalDataResultView,
	type ExternalDataSourceOption
} from "./admin-external-data-dialog.model";

const SOURCE_OPTIONS: ExternalDataSourceOption[] = [
	{
		source: "metacritic",
		name: "Metacritic",
		label: "Metacritic — score"
	},
	{
		source: "hltb",
		name: "HowLongToBeat",
		label: "HowLongToBeat — duration"
	}
];

function hasStoredValue(game: Game, source: ExternalDataSource): boolean {
	return source === "metacritic"
		? game.scores.some(score => score.source === "metacritic")
		: game.times.some(time => time.source === "hltb");
}

function missingSources(game: Game): ExternalDataSource[] {
	return SOURCE_OPTIONS.map(option => option.source).filter(
		source => !hasStoredValue(game, source)
	);
}

function rawScoreDetails(result: ExternalDataRefreshResult): string[] {
	const parts: string[] = [];
	if (typeof result.metaScore === "number")
		parts.push(`Metascore ${result.metaScore}`);
	if (typeof result.userScore === "number")
		parts.push(`User score ${result.userScore}`);
	return parts.length > 0 ? [parts.join(" · ")] : [];
}

function updatedView(result: ExternalDataRefreshResult) {
	const value =
		result.source === "metacritic"
			? typeof result.score === "number"
				? `Score ${result.score}`
				: null
			: typeof result.duration === "number"
				? `${result.duration} h`
				: null;
	return {
		statusLabel: value ? `Updated: ${value}` : "Updated",
		icon: "check_circle",
		tone: "success" as const,
		details: rawScoreDetails(result)
	};
}

function notFoundDetail(source: ExternalDataSource): string {
	return source === "hltb"
		? "The HowLongToBeat ID of this game couldn't be found automatically. Add it by hand from the game editor and refresh again."
		: "No Metacritic page was found for this game. If its slug differs from the title, set the Metacritic slug from the game editor and refresh again.";
}

function ambiguousHint(source: ExternalDataSource): string {
	return source === "hltb"
		? "Add the HowLongToBeat ID by hand from the game editor and refresh again."
		: "Set the Metacritic slug from the game editor to point to the right page and refresh again.";
}

function noDataDetail(source: ExternalDataSource): string {
	return source === "hltb"
		? "The HowLongToBeat page has no Main Story time yet."
		: "The Metacritic page has no score yet.";
}

const DEADLINE_EXCEEDED_CODE = "EXTERNAL_DATA_DEADLINE_EXCEEDED";

function failedDetails(result: ExternalDataRefreshResult): string[] {
	if (result.errorCode === DEADLINE_EXCEEDED_CODE)
		return [
			"Ran out of time: the source was busy, probably with a running job. Nothing was saved for it; try again in a moment."
		];
	return [`Error code: ${result.errorCode ?? "unknown"}`];
}

function resultView(
	result: ExternalDataRefreshResult
): Omit<ExternalDataResultView, "source" | "sourceName"> {
	switch (result.status) {
		case "updated":
			return updatedView(result);
		case "not_found":
			return {
				statusLabel: "Not found",
				icon: "search_off",
				tone: "warning",
				details: [notFoundDetail(result.source)]
			};
		case "ambiguous":
			return {
				statusLabel: "Ambiguous match",
				icon: "help_outline",
				tone: "warning",
				details: [
					"The page found doesn't clearly match this game, so nothing was saved.",
					ambiguousHint(result.source),
					...rawScoreDetails(result)
				]
			};
		case "no_data":
			return {
				statusLabel: "No data",
				icon: "remove_circle_outline",
				tone: "neutral",
				details: [
					noDataDetail(result.source),
					...rawScoreDetails(result)
				]
			};
		default:
			return {
				statusLabel: "Failed",
				icon: "error_outline",
				tone: "danger",
				details: failedDetails(result)
			};
	}
}

@Component({
	selector: "app-admin-external-data-dialog",
	imports: [
		FilterSection,
		UiAlert,
		UiBadge,
		UiButton,
		UiCheckbox,
		UiDialog,
		UiEyebrow
	],
	templateUrl: "./admin-external-data-dialog.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminExternalDataDialog {
	readonly game = input.required<Game>();
	readonly state = input.required<ExternalDataRefreshState>();
	readonly submitted = output<ExternalDataSource[]>();
	readonly closed = output<void>();

	protected readonly sourceOptions = SOURCE_OPTIONS;
	protected readonly selected = linkedSignal<string, ExternalDataSource[]>({
		source: () => this.game().id,
		computation: (gameId, previous) =>
			previous?.source === gameId
				? previous.value
				: untracked(() => missingSources(this.game()))
	});
	protected readonly isPending = computed(
		() => this.state().status === "pending"
	);
	protected readonly canSubmit = computed(
		() => !this.isPending() && this.selected().length > 0
	);
	protected readonly errorMessage = computed(() => {
		const state = this.state();
		return state.status === "error" ? state.message : null;
	});
	protected readonly resultViews = computed<ExternalDataResultView[]>(() => {
		const state = this.state();
		if (state.status !== "done") return [];
		return state.results.map(result => ({
			source: result.source,
			sourceName:
				SOURCE_OPTIONS.find(option => option.source === result.source)
					?.name ?? result.source,
			...resultView(result)
		}));
	});

	protected isSelected(source: ExternalDataSource): boolean {
		return this.selected().includes(source);
	}

	protected setSelected(source: ExternalDataSource, checked: boolean) {
		if (this.isPending()) return;
		const others = this.selected().filter(item => item !== source);
		this.selected.set(
			SOURCE_OPTIONS.map(option => option.source).filter(item =>
				item === source ? checked : others.includes(item)
			)
		);
	}

	protected storedValue(source: ExternalDataSource): string {
		const game = this.game();
		if (source === "metacritic") {
			const score = game.scores.find(s => s.source === "metacritic");
			return score ? `Current: ${score.score}` : "Missing";
		}
		const time = game.times.find(t => t.source === "hltb");
		return time ? `Current: ${time.duration} h` : "Missing";
	}

	protected submit() {
		if (!this.canSubmit()) return;
		this.submitted.emit([...this.selected()]);
	}
}
