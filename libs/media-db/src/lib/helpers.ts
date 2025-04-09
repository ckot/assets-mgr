import { Prisma } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { schemas } from "./schemas";
import { PaginationParams, PositiveInteger } from "./types";
import { DEFAULT_TAG_INCLUDES } from "./constants";

/**
 * Helper function to validate pagination params
 *
 * @param {unknown} page - the requested page number
 * @param {unknown} pageSize - the maximum number of records per page
 * @returns {PaginationParams}
 * @throws {Error} if the parameters fail validation
 */
export function validatePaginationParams(
  page: PositiveInteger,
  pageSize: PositiveInteger
): PaginationParams {
  const pageNum = schemas.positiveInteger.parse(page);
  const numPerPage = schemas.positiveInteger.parse(pageSize);
  return { pageNum, numPerPage };
}

// Helper function to handle Prisma errors
export function handlePrismaError(error: unknown): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        throw new Error(
          `Record not found: ${error.meta?.cause || "Unknown cause"}`
        );
      case "P2016":
        throw new Error(
          `Record does not exist: ${error.meta?.target || "Unknown target"}`
        );
      case "P2002":
        throw new Error(
          `Unique constraint violation: ${
            error.meta?.target || "Unknown field"
          }`
        );
      default:
        throw new Error(`Database error: ${error.message}`);
    }
  } else if (error instanceof PrismaClientValidationError) {
    throw new Error(`Validation error: ${error.message}`);
  } else {
    throw new Error(
      `Unexpected error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Helper function which returns an include clause either return N related
 * sample images or none, depending on param values
 *
 * @param {boolean} includeSampleImages
 * @param {number} sampleSize
 * @returns
 */
export function genTagInclude(
  includeSampleImages: boolean,
  sampleSize: number
): Prisma.TagInclude {
  const validSampleSize = schemas.positiveInteger.parse(sampleSize);
  return includeSampleImages
    ? {
        images: {
          take: validSampleSize,
          orderBy: { id: "desc" },
        },
      }
    : DEFAULT_TAG_INCLUDES;
}
