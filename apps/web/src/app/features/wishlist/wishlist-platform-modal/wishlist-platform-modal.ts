import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
	signal
} from "@angular/core";
import { WishlistService } from "../wishlist.service";
import { UiButton, UiFocusTrap, UiIconButton } from "../../../shared/ui";

export interface PlatformOption {
	id: string;
	name: string;
	abbreviation: string;
}

@Component({
	selector: "app-wishlist-platform-modal",
	imports: [UiButton, UiFocusTrap, UiIconButton],
	templateUrl: "./wishlist-platform-modal.html",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPlatformModal {
	private readonly wishlistService = inject(WishlistService);

	gameId = input.required<string>();
	gameTitle = input.required<string>();
	platforms = input.required<PlatformOption[]>();

	closed = output<void>();
	saved = output<void>();

	protected readonly selectedPlatformId = signal<string | null>(null);
	protected readonly saving = signal(false);

	selectPlatform(id: string) {
		this.selectedPlatformId.set(id);
	}

	confirm(skipPlatform = false) {
		if (this.saving()) return;
		this.saving.set(true);
		const platformId = skipPlatform
			? undefined
			: (this.selectedPlatformId() ?? undefined);
		this.wishlistService.add(this.gameId(), platformId).subscribe({
			next: () => {
				this.saving.set(false);
				this.saved.emit();
			},
			error: () => this.saving.set(false)
		});
	}

	onClose() {
		this.closed.emit();
	}
}
