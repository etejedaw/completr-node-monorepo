import {
	afterNextRender,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	inject,
	Injector,
	input,
	output,
	signal,
	viewChild
} from "@angular/core";

import { UiButton } from "../../ui";

@Component({
	selector: "app-dialog-delete-action",
	imports: [UiButton],
	host: {
		class: "mr-auto flex flex-wrap items-center gap-2 max-md:!basis-full"
	},
	template: `
		@if (confirming()) {
			<span
				class="text-[0.8125rem] text-danger max-md:basis-full"
				role="status"
				>{{ question() }}</span
			>
			<button
				uiButton
				variant="danger"
				type="button"
				class="max-md:flex-1"
				[disabled]="busy()"
				(click)="confirmed.emit()"
			>
				{{ busy() ? "Deleting..." : "Yes, delete" }}
			</button>
			<button
				#keepButton
				uiButton
				variant="ghost"
				type="button"
				class="max-md:flex-1"
				[disabled]="busy()"
				(click)="confirming.set(false)"
			>
				Keep
			</button>
		} @else {
			<button
				uiButton
				variant="ghost"
				type="button"
				class="!text-danger hover:!bg-danger/10 max-md:flex-1"
				[disabled]="busy()"
				(click)="askConfirmation()"
			>
				<span aria-hidden="true" class="material-icons text-base"
					>delete_outline</span
				>
				{{ label() }}
			</button>
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogDeleteAction {
	readonly label = input("Delete");
	readonly question = input("Delete this for good?");
	readonly busy = input(false);
	readonly confirmed = output<void>();

	private readonly injector = inject(Injector);
	private readonly keepButton = viewChild("keepButton", {
		read: ElementRef<HTMLButtonElement>
	});

	protected readonly confirming = signal(false);

	protected askConfirmation() {
		this.confirming.set(true);
		afterNextRender(() => this.keepButton()?.nativeElement.focus(), {
			injector: this.injector
		});
	}
}
