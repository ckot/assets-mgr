import { Prisma } from "@prisma/client"
import { z } from "zod";
import { schemas } from "./schemas";
// types for my prisma models
export type { MediaFile, Tag } from "@prisma/client";

// types based of my zod schemas
export type NonEmptyArrayOfPositiveIntegers = z.infer<
  typeof schemas.nonEmptyArrayOfPositiveIntegers
>;
export type NonEmptyString = z.infer<typeof schemas.nonEmptyString>;
export type PositiveInteger = z.infer<typeof schemas.positiveInteger>;

/**
 * Represents a paginated result set.
 *
 * @template T - The type of items in the result set
 *
 * @property {T[]} data - The array of items for the current page
 * @property {number} total - The total number of items across all pages
 * @property {PositiveInteger} page - The current page number (1-based)
 * @property {PositiveInteger} pageSize - The maximum number of items per page
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: PositiveInteger;
  pageSize: PositiveInteger;
}

export interface PaginationParams {
  pageNum: PositiveInteger;
  numPerPage: PositiveInteger;
}

export interface PaginatedQueryParams {
  page?: number;
  pageSize?: number;
}

export interface GetPaginatedTagsParams extends PaginatedQueryParams {
  whereClause?: Prisma.TagWhereInput;
  include?: Prisma.TagInclude;
  orderBy?: Prisma.TagOrderByWithRelationInput;
}

export interface GetPaginatedMediaFileParams extends PaginatedQueryParams {
  whereClause?: Prisma.MediaFileWhereInput;
  include?: Prisma.MediaFileInclude;
  orderBy?: Prisma.MediaFileOrderByWithRelationInput;
}