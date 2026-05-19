import {
	ChangeDetectionStrategy,
	Component,
	Directive,
	input,
	TemplateRef,
	viewChild
} from "@angular/core";
import {
	NgpDialog,
	NgpDialogDescription,
	NgpDialogOverlay,
	NgpDialogTitle,
	NgpDialogTrigger
} from "ng-primitives/dialog";

@Component({
	selector: "ui-dialog",
	imports: [NgpDialogOverlay, NgpDialog, NgpDialogTrigger],
	template: `
		<button
			class="ui-dialog__trigger-host"
			type="button"
			[ngpDialogTrigger]="content"
		>
			<ng-content select="[uiDialogTrigger]" />
		</button>

		<ng-template #content let-close="close">
			<div ngpDialogOverlay class="ui-dialog__overlay">
				<div
					ngpDialog
					class="ui-dialog__panel"
					[attr.data-size]="size()"
				>
					<ng-content />
				</div>
			</div>
		</ng-template>
	`,
	host: { class: "ui-dialog" },
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiDialog {
	size = input<"sm" | "md" | "lg" | "xl">("md");

	protected readonly content = viewChild.required<TemplateRef<unknown>>("content");
}

@Directive({
	selector: "[uiDialogTitle]",
	hostDirectives: [NgpDialogTitle],
	host: { class: "ui-dialog__title" }
})
export class UiDialogTitle {}

@Directive({
	selector: "[uiDialogDescription]",
	hostDirectives: [NgpDialogDescription],
	host: { class: "ui-dialog__description" }
})
export class UiDialogDescription {}
