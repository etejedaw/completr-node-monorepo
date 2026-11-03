import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	inject,
	Injector,
	input,
	linkedSignal,
	output
} from "@angular/core";
import { form, FormField, maxLength, validate } from "@angular/forms/signals";
import { RouterLink } from "@angular/router";

import { ActionMenu } from "../../../shared/components/action-menu/action-menu";
import { type ActionMenuItem } from "../../../shared/components/action-menu/action-menu.model";
import {
	UiButton,
	UiDescription,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel,
	UiProgress
} from "../../../shared/ui";
import { type UserTag } from "../../mood-tags/mood-tags.model";
import { type TagEdit } from "./tag-row.model";

const MOBILE_ACTIONS: readonly ActionMenuItem[] = [
	{ id: "games", icon: "videogame_asset", label: "Show in My Games" },
	{ id: "edit", icon: "edit", label: "Edit" },
	{ id: "delete", icon: "delete", label: "Delete", iconClass: "text-danger" }
];

const TAG_NAME_MAX_LENGTH = 40;
const TAG_DESCRIPTION_MAX_LENGTH = 255;

let nextRowId = 0;

@Component({
	selector: "app-tag-row",
	imports: [
		ActionMenu,
		UiIconButton,
		UiProgress,
		UiFieldLabel,
		UiFieldOptional,
		FormField,
		RouterLink,
		UiButton,
		UiDescription,
		UiFormField,
		UiInput,
		UiLabel
	],
	templateUrl: "./tag-row.html",
	host: { class: "block" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagRow {
	readonly tag = input.required<UserTag>();
	readonly maxUsage = input(1);
	readonly editing = input(false);
	readonly saving = input(false);

	readonly editRequested = output<void>();
	readonly deleteRequested = output<void>();
	readonly showGamesRequested = output<void>();
	readonly saved = output<TagEdit>();
	readonly cancelled = output<void>();

	private readonly injector = inject(Injector);

	protected readonly fieldId = `tag-row-${nextRowId++}`;
	protected readonly draft = linkedSignal(() => ({
		name: this.tag().tag,
		description: this.tag().description ?? ""
	}));
	protected readonly form = form(this.draft, path => {
		validate(path.name, ({ value }) =>
			value().trim()
				? null
				: { kind: "required", message: "Give the tag a name." }
		);
		maxLength(path.name, TAG_NAME_MAX_LENGTH, {
			message: `Use ${TAG_NAME_MAX_LENGTH} characters or fewer.`
		});
		maxLength(path.description, TAG_DESCRIPTION_MAX_LENGTH, {
			message: `Use ${TAG_DESCRIPTION_MAX_LENGTH} characters or fewer.`
		});
	});
	protected readonly mobileActions = computed<readonly ActionMenuItem[]>(() =>
		MOBILE_ACTIONS.map(action =>
			action.id === "games"
				? action
				: { ...action, disabled: this.saving() }
		)
	);
	protected readonly usagePercent = computed(() =>
		Math.round((this.tag().usageCount / Math.max(1, this.maxUsage())) * 100)
	);

	constructor() {
		effect(() => {
			if (!this.editing()) return;
			afterNextRender(() => this.form.name().focusBoundControl(), {
				injector: this.injector
			});
		});
	}

	protected runMobileAction(id: string) {
		if (id === "games") this.showGamesRequested.emit();
		else if (id === "edit") this.editRequested.emit();
		else this.deleteRequested.emit();
	}

	protected save() {
		if (this.saving()) return;
		this.form().markAsTouched();
		if (this.form().invalid()) {
			const firstInvalid = this.form.name().invalid()
				? this.form.name
				: this.form.description;
			firstInvalid().focusBoundControl();
			return;
		}
		const { name, description } = this.draft();
		this.saved.emit({ name: name.trim(), description });
	}

	protected cancel() {
		this.form().reset({
			name: this.tag().tag,
			description: this.tag().description ?? ""
		});
		this.cancelled.emit();
	}
}
