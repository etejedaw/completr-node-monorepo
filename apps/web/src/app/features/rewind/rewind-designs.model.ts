import {
	type InputSignal,
	type OutputEmitterRef,
	type Type
} from "@angular/core";

import { type Rewind } from "../../core/models/rewind.model";

export interface RewindDesignComponent {
	readonly rewind: InputSignal<Rewind>;
	readonly username: InputSignal<string>;
	readonly isOwner: InputSignal<boolean>;
	readonly rewindChange: OutputEmitterRef<Rewind>;
}

export interface RewindDesignEntry {
	key: string;
	component: Type<RewindDesignComponent>;
}
