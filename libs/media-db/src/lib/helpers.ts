import { Prisma } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { schemas } from "./schemas";
import { PaginationParams, PositiveInteger, CreateResult, RetrieveResult, UpdateResult, DeleteResult } from "./types";
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

// Generate standardized error messages from Prisma errors
export function generatePrismaErrorMessage(error: unknown): string {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return `Record not found: ${error.meta?.cause || "Unknown cause"}`;
      case "P2016":
        return `Record does not exist: ${error.meta?.target || "Unknown target"}`;
      case "P2002":
        return `Unique constraint violation: ${error.meta?.target || "Unknown field"}`;
      default:
        return `Database error: ${error.message}`;
    }
  } else if (error instanceof PrismaClientValidationError) {
    return `Validation error: ${error.message}`;
  } else {
    // Handle other types of database errors, as well as non-Prisma errors.
    // For instance validation checks (such as zod) can be performed within the same
    // try/catch block as the Prisma client, and will get handled here
    return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Throw an error with the standardized message
export function handlePrismaError(error: unknown): never {
  throw new Error(generatePrismaErrorMessage(error));
}

/**
 * Helper function which returns an include clause either return N related
 * sample images or none, depending on param values
 *
 * @param {boolean} includeSampleMediaFiles
 * @param {number} sampleSize
 * @returns
 */
export function genTagInclude(
  includeSampleMediaFiles: boolean,
  sampleSize: number
): Prisma.TagInclude {
  const validSampleSize = schemas.positiveInteger.parse(sampleSize);
  return includeSampleMediaFiles
    ? {
        mediaFiles: {
          take: validSampleSize,
          orderBy: { id: "desc" },
        },
      }
    : DEFAULT_TAG_INCLUDES;
}


/**
 * Helper function to create a standard response for a successful creation
 *
 * @template T - the type of the data being created
 * @param {T} data - the data being created
 * @param {string} messagePrefix - Descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {CreateResult<T>} - the result object
*/
export function creationSuccessful<T>(data: T, messagePrefix: string): CreateResult<T> {
  return {
    success: true,
    created: true,
    data,
    message: `${messagePrefix} created successfully.`,
  };
}

/**
 * Helper function to create a standard response for a creation where a pre-existing
 * object was found
 *
 * @template T - the type of the data being created
 * @param data
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                  any descriptive string
 * @returns {CreateResult<T>} - the result object
 */
export function creationFoundPrexisting<T>(
  data: T,
  messagePrefix: string
): CreateResult<T> {
  return {
    success: true,
    created: false,
    data,
    message: `${messagePrefix} already exists.`,
  };
}

/**
 * Helper function to create a standard response for a creation failure
 *
 * @template T - the type of the data being created
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {CreateResult<T>} - the result object
 */
export function creationFailure<T>(messagePrefix: string): CreateResult<T> {
  return {
    success: true,
    created: false,
    message: `${messagePrefix} not found.`,
  };
}

/**
 * Helper function to create a standard response for a creation error
 *
 * @template T - the type of the data being created
 * @param {string} message - the error message
 * @returns {CreateResult<T>} - the result object
*/
export function creationError<T>(message: string): CreateResult<T> {
  return {
    success: false,
    created: false,
    message,
  };
}

/**
 * Helper function to create a standard response for a successful retrieval
 *
 * @template T - the type of the data being retrieved
 * @param {T} data - the data being retrieved
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                any descriptive string
 * @returns {RetrieveResult<T>} - the result object
 */
export function retrievalSuccessful<T>(data: T, messagePrefix: string): RetrieveResult<T> {
  return {
    success: true,
    found: true,
    data,
    message: `${messagePrefix} retrieved successfully.`,
  };
}

/**
 * Helper function to create a standard response for a retrieval where
 * the object was not found
 *
 * @template T - the type of the data being retrieved
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {RetrieveResult<T>} - the result object
 */
export function retrievalNotFound<T>(typeName: string): RetrieveResult<T> {
  return {
    success: true,
    found: false,
    message: `${typeName} not found.`,
  };
}

/**
 * Helper function to create a standard response for a retrieval error
 *
 * @template T - the type of the data being retrieved
 * @param {string} message - the error message
 * @returns {RetrieveResult<T>} - the result object
 */
export function retrievalError<T>(message: string): RetrieveResult<T> {
  return {
    success: false,
    found: false,
    message,
  };
}

/**
 * Helper function to create a standard response for a successful update
 *
 * @template T - the type of the data being updated
 * @param {T} data - the updated data
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {UpdateResult<T>} - the result object
 */
export function updateSuccessful<T>(data: T, messagePrefix: string): UpdateResult<T> {
  return {
    success: true,
    updated: true,
    data,
    message: `${messagePrefix} updated successfully.`,
  };
}

/**
 * Helper function to create a standard response for an update where
 * the object was not found
 *
 * @template T - the type of the data being updated
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {UpdateResult<T>} - the result object
 */
export function updateNotFound<T>(messagePrefix: string): UpdateResult<T> {
  return {
    success: true,
    updated: false,
    message: `${messagePrefix} not found.`,
  };
}

/**
 * Helper function to create a standard response for an update error
 *
 * @template T - the type of the data being updated
 * @param {string} message - the error message
 * @returns {UpdateResult<T>} - the result object
 */
export function updateError<T>(message: string): UpdateResult<T> {
  return {
    success: false,
    updated: false,
    message,
  };
}

/**
 * Helper function to create a standard response for a successful deletion
 *
 * @template T - the type of the data being deleted
 * @param {T} data - the deleted data
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {DeleteResult<T>} - the result object
 */
export function deletionSuccessful<T>(data: T, messagePrefix: string): DeleteResult<T> {
  return {
    success: true,
    deleted: true,
    data,
    message: `${messagePrefix} deleted successfully.`,
  };
}

/**
 * Helper function to create a standard response for a deletion where
 * the object was not found
 *
 * @template T - the type of the data being deleted
 * @param {string} messagePrefix - descriptive text which will be prepended to
 *                                 the message. Can be the name of the type or
 *                                 any descriptive string
 * @returns {DeleteResult<T>} - the result object
 */
export function deletionNotFound<T>(messagePrefix: string): DeleteResult<T> {
  return {
    success: true,
    deleted: false,
    message: `${messagePrefix} not found.`,
  };
}

/**
 * Helper function to create a standard response for a deletion error
 *
 * @template T - the type of the data being deleted
 * @param {string} message - the error message
 * @returns {DeleteResult<T>} - the result object
 */
export function deletionError<T>(message: string): DeleteResult<T> {
  return {
    success: false,
    deleted: false,
    message,
  };
}