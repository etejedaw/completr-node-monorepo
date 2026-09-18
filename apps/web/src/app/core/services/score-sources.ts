import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";

import { environment } from "../../../environments/environment";

export interface ScoreSourceInfo {
	code: string;
	name: string;
	scale: number;
}

interface ScoreSourcesResponse {
	data: { sources: ScoreSourceInfo[] };
}

@Injectable({ providedIn: "root" })
export class ScoreSourcesService {
	private readonly http = inject(HttpClient);
	private readonly _sources = signal<ScoreSourceInfo[]>([]);
	readonly sources = this._sources.asReadonly();

	load() {
		if (this._sources().length > 0) return;
		this.http
			.get<ScoreSourcesResponse>(`${environment.apiUrl}/score-sources`)
			.subscribe(res => this._sources.set(res.data.sources));
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
