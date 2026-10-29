import { type RegisterBacklogDto } from "./dtos/register-backlog.dto";

export type BacklogFields = Omit<
	RegisterBacklogDto,
	"addToQueue" | "addToShelf" | "moodTags" | "review" | "progressNote"
>;

export type BacklogReview = NonNullable<RegisterBacklogDto["review"]>;
