export interface UserTag {
	tag: string;
	usageCount: number;
	description: string | null;
}

export interface MyTagsResponse {
	data: { tags: UserTag[] };
}

export interface UpdateTagResponse {
	data: { tag: string };
}

export interface UpdateTagDto {
	newTag?: string;
	description?: string | null;
}

export interface CreateTagDto {
	tag: string;
	description?: string | null;
}

export interface CreateTagResponse {
	data: { tag: string; description: string | null };
}

export interface GameTagsResponse {
	data: { tags: string[] };
}
