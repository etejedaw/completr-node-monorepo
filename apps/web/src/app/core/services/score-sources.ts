import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import {
	catchError,
	map,
	type Observable,
	shareReplay,
	tap,
	throwError
} from "rxjs";

import { environment } from "../../../environments/environment";

export interface ScoreSourceInfo {
	code: string;
	name: string;
	scale: number;
	priority: number;
}

interface ScoreSourcesResponse {
	data: { sources: ScoreSourceInfo[] };
}

const COMPUTED_SCORE_SOURCE = "completr";

@Injectable({ providedIn: "root" })
export class ScoreSourcesService {
	private readonly http = inject(HttpClient);
	private readonly _sources = signal<ScoreSourceInfo[]>([]);
	readonly sources = this._sources.asReadonly();

	private sources$?: Observable<ScoreSourceInfo[]>;

	load(): void {
		this.whenLoaded().subscribe();
	}

	whenLoaded(): Observable<ScoreSourceInfo[]> {
		this.sources$ ??= this.http
			.get<ScoreSourcesResponse>(`${environment.apiUrl}/score-sources`)
			.pipe(
				map(res => res.data.sources),
				tap(sources => this._sources.set(sources)),
				catchError(error => {
					this.sources$ = undefined;
					return throwError(() => error);
				}),
				shareReplay(1)
			);
		return this.sources$;
	}

	manualSources(): ScoreSourceInfo[] {
		return this._sources().filter(
			source => source.code !== COMPUTED_SCORE_SOURCE
		);
	}

	getScale(sourceCode: string): number | null {
		const source = this._sources().find(s => s.code === sourceCode);
		return source?.scale ?? null;
	}

	normalize(score: number, sourceCode: string): number {
		const scale = this.getScale(sourceCode);
		if (!scale || scale === 5) return score;
		return Math.round((score / scale) * 5 * 100) / 100;
	}
}
