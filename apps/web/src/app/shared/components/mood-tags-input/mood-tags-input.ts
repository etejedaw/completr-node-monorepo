import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal
} from "@angular/core";
import { FormsModule } from "@angular/forms";

function normalizeTag(input: string): string {
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");
}

@Component({
	selector: "app-mood-tags-input",
	imports: [FormsModule],
	templateUrl: "./mood-tags-input.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodTagsInput {
	tags = input<string[]>([]);
	suggestions = input<string[]>([]);
	placeholder = input("Add a tag…");
	max = input(10);

	tagsChange = output<string[]>();

	protected readonly draft = signal("");
	protected readonly focused = signal(false);

	protected readonly canAdd = computed(() => this.tags().length < this.max());

	protected readonly filteredSuggestions = computed(() => {
		const draft = normalizeTag(this.draft());
		const current = new Set(this.tags());
		const all = this.suggestions().filter(s => !current.has(s));
		if (!draft) return all.slice(0, 8);
		return all.filter(s => s.includes(draft)).slice(0, 8);
	});

	protected onInput(value: string) {
		this.draft.set(value);
	}

	protected onKey(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			this.commit();
			return;
		}
		if (event.key === "," ) {
			event.preventDefault();
			this.commit();
			return;
		}
		if (event.key === "Backspace" && this.draft() === "" && this.tags().length > 0) {
			event.preventDefault();
			this.removeAt(this.tags().length - 1);
			return;
		}
	}

	protected commit() {
		const tag = normalizeTag(this.draft());
		this.draft.set("");
		if (!tag) return;
		if (tag.length > 40) return;
		if (!this.canAdd()) return;
		const current = this.tags();
		if (current.includes(tag)) return;
		this.tagsChange.emit([...current, tag]);
	}

	protected pickSuggestion(tag: string) {
		this.draft.set("");
		if (!this.canAdd()) return;
		const current = this.tags();
		if (current.includes(tag)) return;
		this.tagsChange.emit([...current, tag]);
	}

	protected removeAt(index: number) {
		const next = [...this.tags()];
		next.splice(index, 1);
		this.tagsChange.emit(next);
	}

	protected onFocus() {
		this.focused.set(true);
	}

	protected onBlur() {
		setTimeout(() => this.focused.set(false), 150);
	}
}
