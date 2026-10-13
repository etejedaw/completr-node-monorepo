import {
	ChangeDetectionStrategy,
	Component,
	input,
	output
} from "@angular/core";

@Component({
	selector: "app-activity-delete-button",
	template: `
		<button
			type="button"
			class="-mr-2 w-8 h-8 max-sm:min-w-[44px] max-sm:min-h-[44px] pointer-coarse:min-w-[44px] pointer-coarse:min-h-[44px] inline-flex items-center justify-center rounded-full bg-transparent border-0 text-fg-muted cursor-pointer transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100 pointer-coarse:opacity-100 hover:text-danger"
			[attr.aria-label]="
				multiple() ? 'Remove these activities' : 'Remove this activity'
			"
			[attr.title]="tooltip()"
			(click)="pressed.emit()"
		>
			<span aria-hidden="true" class="material-icons text-base"
				>close</span
			>
		</button>
	`,
	host: { class: "shrink-0 inline-flex" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityDeleteButton {
	readonly multiple = input(false);
	readonly tooltip = input("Remove activity");
	readonly pressed = output();
}
