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

export interface GetPaginatedPinsParams extends PaginatedQueryParams {
  whereClause?: Prisma.PinWhereInput;
  include?: Prisma.PinInclude;
  orderBy?: Prisma.PinOrderByWithRelationInput;
}
// Base result type for all CRUD operations
export interface OperationResult<T> {
  // simply indicates an error did not occur. each operation type (see below)
  // will have an operation-specific boolean field signifying whether the
  // operation was successful or not
  success: boolean;
  // the data returned from the operation. won't be present if
  // the object is not found or the operation fails (error)
  data?: T;
  message: string;
}

// For create operations
export interface CreateResult<T> extends OperationResult<T> {
  created: boolean; // false if object already exists
}
export interface RetrieveResult<T> extends OperationResult<T> {
  found: boolean; // false if object not found
}
// For update operations
export interface UpdateResult<T> extends OperationResult<T> {
  updated: boolean; // false if object not found
}

// For delete operations
export interface DeleteResult<T> extends OperationResult<T> {
  deleted: boolean; // false if object not found
}

/**
 * Represents a paginated result set.
 *
 * @property {number} total - The total number of items across all pages
 * @property {PositiveInteger} page - The current page number (1-based)
 * @property {PositiveInteger} pageSize - The maximum number of items per page
 */
export interface PaginatedResult<T> extends OperationResult<T[]> {
  total: number;
  page: PositiveInteger;
  pageSize: PositiveInteger;
}
