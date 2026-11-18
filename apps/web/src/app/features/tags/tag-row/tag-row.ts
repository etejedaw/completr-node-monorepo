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

import { type UserTag } from "../../../core/services/mood-tags.model";
import { AppearancePicker } from "../../../shared/components/appearance-picker/appearance-picker";
import { TagIcon } from "../../../shared/components/tag-icon/tag-icon";
import {
	DEFAULT_TAG_ICON,
	MAX_FAVORITE_TAGS
} from "../../../shared/constants/mood-tags";
import {
	UiActionMenu,
	type UiActionMenuItem,
	UiButton,
	UiDescription,
	UiFieldError,
	UiFieldLabel,
	UiFieldOptional,
	UiFormField,
	UiIconButton,
	UiInput,
	UiLabel,
	UiProgress
} from "../../../shared/ui";
import { supportedAppearanceColor } from "../../../shared/utils/appearance";
import { tagColorOf } from "../../../shared/utils/tag-appearance";
import { type TagEdit } from "./tag-row.model";

const MOBILE_ACTIONS: readonly UiActionMenuItem[] = [
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
		UiActionMenu,
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
		UiLabel,
		UiFieldError,
		AppearancePicker,
		TagIcon
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
	readonly favorite = input(false);
	readonly favoriteLocked = input(false);

	readonly editRequested = output<void>();
	readonly deleteRequested = output<void>();
	readonly showGamesRequested = output<void>();
	readonly saved = output<TagEdit>();
	readonly cancelled = output<void>();
	readonly favoriteToggled = output<void>();

	private readonly injector = inject(Injector);

	protected readonly fieldId = `tag-row-${nextRowId++}`;
	protected readonly draft = linkedSignal(() => ({
		name: this.tag().tag,
		description: this.tag().description ?? ""
	}));
	protected readonly draftIcon = linkedSignal(() => this.tag().icon);
	protected readonly draftColor = linkedSignal(() =>
		supportedAppearanceColor(this.tag().color)
	);
	protected readonly defaultIcon = DEFAULT_TAG_ICON;
	protected readonly accent = computed(() => tagColorOf(this.tag().color));
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
	protected readonly mobileActions = computed<readonly UiActionMenuItem[]>(
		() =>
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

	protected readonly favoriteTitle = computed(() => {
		if (this.favorite()) return "Remove from favorites";
		return this.favoriteLocked()
			? `You can pick up to ${MAX_FAVORITE_TAGS} favorites`
			: "Add to favorites";
	});

	protected toggleFavorite() {
		if (!this.favorite() && this.favoriteLocked()) return;
		this.favoriteToggled.emit();
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
		this.saved.emit({
			name: name.trim(),
			description,
			icon: this.draftIcon(),
			color: this.draftColor()
		});
	}

	protected cancel() {
		this.form().reset({
			name: this.tag().tag,
			description: this.tag().description ?? ""
		});
		this.draftIcon.set(this.tag().icon);
		this.draftColor.set(supportedAppearanceColor(this.tag().color));
		this.cancelled.emit();
	}
}
