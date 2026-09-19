const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

const API_BASE = "https://api.github.com";

interface GitHubRepo {
	license: { spdx_id: string } | null;
}

type GitHubLanguages = Record<string, number>;

async function githubFetch<T>(endpoint: string): Promise<T> {
	const res = await fetch(`${API_BASE}/${endpoint}`, {
		headers: {
			Accept: "application/vnd.github+json",
			...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {})
		},
		signal: AbortSignal.timeout(5000)
	});
	if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
	return res.json();
}

export async function getRepoLicense(repo: string): Promise<string | null> {
	const data = await githubFetch<GitHubRepo>(`repos/${repo}`);
	return data.license?.spdx_id ?? null;
}

export async function getRepoLanguages(repo: string): Promise<GitHubLanguages> {
	return githubFetch<GitHubLanguages>(`repos/${repo}/languages`);
}

export type { GitHubLanguages };
