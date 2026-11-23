import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function toSkipTake({ page, limit }: Pagination) {
  return { skip: (page - 1) * limit, take: limit };
}

/** Standard paginated response body. */
export function paginated<T>(items: T[], total: number, { page, limit }: Pagination) {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
