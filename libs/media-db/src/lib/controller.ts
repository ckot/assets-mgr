import { Prisma, PrismaClient} from "@prisma/client";
import type {MediaFile, Tag, Website} from "@prisma/client"

import type {
  GetPaginatedMediaFileParams,
  GetPaginatedTagsParams,
  NonEmptyArrayOfPositiveIntegers,
  // NonEmptyString,
  PaginatedResult,
  PositiveInteger
 } from "./types";

import {
  DEFAULT_PAGE_NUMBER,
  DEFAULT_PAGE_SIZE,
  DEFAULT_MEDIA_FILE_INCLUDES,
  DEFAULT_MEDIA_FILE_ORDER_BY,
  DEFAULT_MEDIA_FILE_SAMPLE_SIZE,
  DEFAULT_TAG_INCLUDES,
  DEFAULT_TAG_ORDER_BY,
  // DEFAULT_WEBSITE_INCLUDES,
  DEFAULT_WEBSITE_ORDER_BY,
} from "./constants";

import { schemas } from "./schemas";

import {
  genTagInclude,
  handlePrismaError,
  validatePaginationParams,
} from "./helpers";



// export async function getBoardPath(boardId: string): Promise<string[]> {
//   const path: string[] = [];
//   let currentBoard = await prisma.board.findUnique({
//     where: { id: boardId },
//     include: { parent: true },
//   });

//   while (currentBoard) {
//     path.unshift(currentBoard.name);
//     if (!currentBoard.parentId) break;

//     currentBoard = await prisma.board.findUnique({
//       where: { id: currentBoard.parentId },
//       include: { parent: true },
//     });
//   }

//   return path;
// }


// export async function addPinWithTags(
//   boardId: string,
//   mediaFileId: string,
//   pinData: { title?: string; description?: string; sourceUrl?: string }
// ): Promise<Pin> {
//   // Get board path for tags
//   const boardPath = await getBoardPath(boardId);

//   // Create pin
//   const pin = await prisma.pin.create({
//     data: {
//       ...pinData,
//       board: { connect: { id: boardId } },
//       mediaFile: { connect: { id: mediaFileId } },
//     },
//   });

//   // Add tags based on board hierarchy
//   await prisma.mediaFile.update({
//     where: { id: mediaFileId },
//     data: {
//       tags: {
//         connectOrCreate: boardPath.map((name) => ({
//           where: { name },
//           create: { name },
//         })),
//       },
//     },
//   });

//   return pin;
// }


// export async function addMediaFileWithPathTags(
//   mediaFile: { path: string; hash: string /* other fields */ },
//   pathSegments: string[]
// ): Promise<MediaFile> {
//   return prisma.mediaFile.create({
//     data: {
//       ...mediaFile,
//       tags: {
//         connectOrCreate: pathSegments.map((name) => ({
//           where: { name },
//           create: { name },
//         })),
//       },
//     },
//     include: { tags: true },
//   });
// }

/**
 * Database controller that abstracts away the underlying ORM and database implementation.
 * Provides methods for managing media files and tags in the database.
 *
 * @class DBController
 *
 * Most applications should use the exported `db` singleton instance (below).
 * Create your own instance only if you need multiple database connections
 * or for testing purposes.
 */
export class DBController {
  /**
   * Prisma client instance for database operations.
   */
  prisma: PrismaClient;

  /**
   * Creates a new DBController instance and initializes the Prisma client.
   */
  constructor() {
    this.prisma = new PrismaClient();
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Creates a new website in the database.
   *
   * @param {string} url - The URL of the website
   * @param {string} name - The name of the website
   * @returns {Promise<Website>} The created website
   * @throws {Error} If the website creation fails (e.g., validation error, unique constraint violation)
   */
  async createWebSite({
    url,
    name,
  }: {
    url: string;
    name: string;
  }): Promise<Website> {
    try {
      return await this.prisma.website.create({
        data: {
          url,
          name,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Retrieves a website by its ID.
   *
   * @param {PositiveInteger} id - The ID of the website to retrieve
   * @returns {Promise<Website>} The retrieved website
   * @throws {Error} If the website is not found or another database error occurs
   */
  async getWebSiteByID(id: PositiveInteger): Promise<Website> {
    const validatedID = schemas.positiveInteger.parse(id);
    try {
      return await this.prisma.website.findUniqueOrThrow({
        where: {
          id: validatedID,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Retrieves a website by its URL.
   *
   * @param {string} url - The URL of the website to retrieve
   * @returns {Promise<Website>} The retrieved website
   * @throws {Error} If the website is not found or another database error occurs
   */
  async getWebSiteByURL(url: string): Promise<Website> {
    try {
      return await this.prisma.website.findUniqueOrThrow({
        where: {
          url,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /** Retrieves all websites from the database, sorted alphabetically by name and paginated
   *
   * @returns {Promise<PaginatedResult<Website>>} A paginated array of all websites
   */
  async getAllWebsites(): Promise<PaginatedResult<Website>> {

    return this.getPaginatedWebsites({
      whereClause: {},
      include: {},
      orderBy: DEFAULT_WEBSITE_ORDER_BY,
      page: DEFAULT_PAGE_NUMBER,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  }

  async deleteWebsite(id: PositiveInteger): Promise<Website> {
    const validatedID = schemas.positiveInteger.parse(id);
    try {
      return await this.prisma.website.delete({
        where: {
          id: validatedID,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Creates a new media file in the database.
   *
   * @param {Prisma.MediaFileCreateInput} mFile - The media file data to create
   * @returns {Promise<MediaFile>} The created media file
   * @throws {Error} If the media file creation fails (e.g., validation error, unique constraint violation)
   */
  async createMediaFile(
    mFile: Prisma.MediaFileCreateInput
  ): Promise<MediaFile> {
    try {
      return await this.prisma.mediaFile.create({ data: mFile });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Creates a new tag in the database.
   *
   * @param {Prisma.TagCreateInput} tag - The tag data to create
   * @returns {Promise<Tag>} The created tag
   * @throws {Error} If the tag creation fails (e.g., validation error, unique constraint violation)
   */
  async createTag(tag: Prisma.TagCreateInput): Promise<Tag> {
    try {
      return await this.prisma.tag.create({ data: tag });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Retrieves a media file by its ID.
   *
   * @param {PositiveInteger} mediaFileID - The ID of the media file to retrieve
   * @param {boolean} [includeTags=true] - Whether to include related tags in the result
   * @returns {Promise<MediaFile>} The retrieved media file with its tags (if includeTags is true)
   * @throws {Error} If the media file is not found or another database error occurs
   */
  async getMediaFileByID(
    mediaFileID: PositiveInteger,
    includeTags = true
  ): Promise<MediaFile> {
    const validatedMediaFileID = schemas.positiveInteger.parse(mediaFileID);
    try {
      return await this.prisma.mediaFile.findUniqueOrThrow({
        where: {
          id: validatedMediaFileID,
        },
        include: {
          tags: includeTags,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }
  /**
   * Retrieves all tags from the database, sorted alphabetically by name and paginated
   *
   * @param {Object} options
   * @param {boolean} [options.includeSampleMediaFiles=false] - whether or not to include a small set of media files representing this tag
   * @param {boolean} [options.sampleSize=DEFAULT_MEDIA_FILE_SAMPLE_SIZE] - how many sample media files to provide (ignored if includeSampleMediaFiles=false)
   * @param {PositiveInteger} [options.page=DEFAULT_PAGE_NUMBER] - the page number of results to retrieve
   * @param {PositiveInteger} [options.pageSize=DEFAULT_PAGE_SIZE] - the maximum number of records per page
   *
   * @returns {Promise<PaginatedResult<Tag>>} a promise which resolves to a paginated array of all tags
   */
  async getAllTags({
    includeSampleMediaFiles = false,
    sampleSize = DEFAULT_MEDIA_FILE_SAMPLE_SIZE,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }): Promise<PaginatedResult<Tag>> {
    const whereClause: Prisma.TagWhereInput = {};
    const include = genTagInclude(includeSampleMediaFiles, sampleSize);
    const orderBy: Prisma.TagOrderByWithRelationInput = DEFAULT_TAG_ORDER_BY;

    return await this.getPaginatedTags({
      whereClause,
      include,
      orderBy,
      page,
      pageSize,
    });
  }

  /**
   * Retrieves all tags whose name match a substring, sorted by name and paginated
   *
   * @param {Object} options - this method uses named parameters
   * @param {string} [options.substring] - the string to search for with tag names
   * @param {boolean} [options.includeSampleMediaFiles=false] - whether or not to include a small set of media files representing this tag
   * @param {boolean} [options.sampleSize=DEFAULT_MEDIA_FILE_SAMPLE_SIZE] - how many sample media filess to provide (if includeSampleMediaFiles=true)
   * @param {PositiveInteger} [options.page=DEFAULT_PAGE_NUMBER] - the page number of results to retrieve
   * @param {PositiveInteger} [options.pageSize=DEFAULT_PAGE_SIZE] - the maximum number of records per page

   * @returns {Promise<PaginatedResult<Tag>>} a promise which resolves to a paginated array of all matching tags
   */
  async searchTags({
    substring = '', // default value will fail validation
    includeSampleMediaFiles = false,
    sampleSize = 5,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }): Promise<PaginatedResult<Tag>> {
    // runtime validation of search term
    const validSearchTerm = schemas.nonEmptyString.parse(substring);
    const whereClause: Prisma.TagWhereInput = {
      name: {
        contains: validSearchTerm,
      },
    };
    const include = genTagInclude(includeSampleMediaFiles, sampleSize);

    return await this.getPaginatedTags({
      whereClause,
      include,
      page,
      pageSize,
    });
  }

  /**
   * Retrieves a tag by its ID.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to retrieve
   * @param {boolean} [includeMediaFiles=false] - Whether to include related media files in the result
   *
   * @returns {Promise<Tag>} The retrieved tag with its media files (if includeMediaFiless is true)
   * @throws {Error} If the tag is not found or another database error occurs
   */
  async getTagByID(tagID = -1, includeMediaFiles = false): Promise<Tag> {
    const validatedTagID = schemas.positiveInteger.parse(tagID);
    try {
      return await this.prisma.tag.findUniqueOrThrow({
        where: {
          id: validatedTagID,
        },
        include: {
          mediaFiles: includeMediaFiles,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Retrieves a tag by its name.
   *
   * @param {string} tagName - The name of the tag to retrieve
   * @param {boolean} [includeMediaFiless=false] - Whether to include related media filess in the result
   *
   * @returns {Promise<Tag>} The retrieved tag with its media files (if includeMediaFiless is true)
   * @throws {Error} If the tag is not found or another database error occurs
   */
  async getTagByName(tagName: string, includeMediaFiles = false): Promise<Tag> {
    try {
      return await this.prisma.tag.findUniqueOrThrow({
        where: {
          name: tagName,
        },
        include: {
          mediaFiles: includeMediaFiles,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Retrieves a paginated set of media files which don't have any tags
   *
   * @param {PositiveInteger} [page=DEFAULT_PAGE_NUMBER] - the page number of media files to retrieve
   * @param {PositiveInteger} [pageSize=DEFAULT_PAGE_SIZE] - the maximum number of media files per page
   *
   * @returns {Promise<PaginatedResult<MediaFile>>} A paginated Array of untagged media files
   * @throws {Error} If a database error occurs
   */
  async getUntaggedMediaFiles(
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResult<MediaFile>> {
    const whereClause: Prisma.MediaFileWhereInput = {
      tags: {
        none: {},
      },
    };
    const include: Prisma.MediaFileInclude = {
      tags: false,
    };
    return await this.getPaginatedMediaFiles({
      whereClause,
      include,
      page,
      pageSize,
    });
  }

  /**
   * Retrives a paginated set of media files which have ALL of the specified tags
   *
   * @param {NonEmptyArrayOfPositiveIntegers} tagIDs - the IDs for the tags being searched for
   * @param {PositiveInteger} [page=DEFAULT_PAGE_NUMBER] - the page number
   * @param {PositiveInteger} [pageSize=DEFAULT_PAGE_SIZE] - the max number of media files per page
   *
   * @returns
   */
  async getMediaFilesWithTags(
    tagIDs: NonEmptyArrayOfPositiveIntegers,
    page = DEFAULT_PAGE_SIZE,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResult<MediaFile>> {
    // runtime validation of tagIDs array
    const validTags = schemas.nonEmptyArrayOfPositiveIntegers.parse(tagIDs);

    const whereClause: Prisma.MediaFileWhereInput = {
      AND: validTags.map((tagID) => ({
        tags: {
          some: {
            id: tagID,
          },
        },
      })),
    };
    return await this.getPaginatedMediaFiles({
      whereClause,
      page,
      pageSize,
    });
  }

  /**
   * Renames a tag.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to rename
   * @param {string} newName - The new name for the tag
   * @returns {Promise<Tag>} The updated tag
   * @throws {Error} If the tag is not found, the new name conflicts with an existing tag, or another database error occurs
   */
  async renameTag(tagID: PositiveInteger, newName: string): Promise<Tag> {
    const validatedTagID = schemas.positiveInteger.parse(tagID);
    try {
      return await this.prisma.tag.update({
        where: {
          id: validatedTagID,
        },
        data: {
          name: newName,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Migrates media files from one tag to another.
   * Finds all media files with the fromTagID and replaces that tag with toTagID.
   *
   * @param {PositiveInteger} fromTagID - The ID of the source tag
   * @param {PositiveInteger} toTagID - The ID of the destination tag
   * @returns {Promise<MediaFile[]>} Array of updated media files
   * @throws {Error} If either tag is not found or another database error occurs
   */
  async migrateMediaFileTag(
    fromTagID: PositiveInteger,
    toTagID: PositiveInteger
  ): Promise<MediaFile[]> {
    const validatedOldTagID = schemas.positiveInteger.parse(fromTagID);
    const validatedNewTagID = schemas.positiveInteger.parse(toTagID);

    const mediaFilesWithOldTag = await this.prisma.mediaFile.findMany({
      where: {
        tags: {
          some: {
            id: validatedOldTagID,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const mediaFileIDs = mediaFilesWithOldTag.map((mf) => mf.id);

    return await this.prisma.$transaction(
      mediaFileIDs.map((mediaFileID) =>
        this.prisma.mediaFile.update({
          where: { id: mediaFileID },
          data: {
            tags: {
              disconnect: { id: validatedOldTagID },
              connect: { id: validatedNewTagID },
            },
          },
        })
      )
    );
  }

  /**
   * Updates the tags for a specific media file.
   * Replaces all existing tags with the provided set of tags.
   *
   * @param {PositiveInteger} mediaFileID - The ID of the media file to update
   * @param {NonEmptyArrayOfPositiveIntegers} newTagIDs - Array of tag IDs to assign to the media file
   * @returns {Promise<MediaFile>} The updated media file with its new tags
   * @throws {Error} If the media file is not found, any tag is not found, or another database error occurs
   */
  async updateMediaFileTags(
    mediaFileID: PositiveInteger,
    newTagIDs: NonEmptyArrayOfPositiveIntegers
  ): Promise<MediaFile> {
    const validMediaFileID = schemas.positiveInteger.parse(mediaFileID);
    const validTags = schemas.nonEmptyArrayOfPositiveIntegers.parse(newTagIDs);

    try {
      return await this.prisma.mediaFile.update({
        where: {
          id: validMediaFileID,
        },
        data: {
          tags: {
            set: validTags.map((tagID) => ({ id: tagID })),
          },
        },
        include: {
          tags: true,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Deletes an media file from the database.
   * This will also remove the media file from all associated tags.
   *
   * @param {PositiveInteger} mediaFileID - The ID of the media file to delete
   * @returns {Promise<MediaFile>} The deleted media file
   * @throws {Error} If the media file is not found or another database error occurs
   */
  async deleteMediaFile(mediaFileID: PositiveInteger): Promise<MediaFile> {
    const validatedMediaFileID = schemas.positiveInteger.parse(mediaFileID);
    try {
      return await this.prisma.mediaFile.delete({
        where: {
          id: validatedMediaFileID,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Deletes a tag from the database.
   * This will also remove the tag from all associated media files.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to delete
   * @returns {Promise<Tag>} The deleted tag
   * @throws {Error} If the tag is not found or another database error occurs
   */
  async deleteTag(tagID: PositiveInteger): Promise<Tag> {
    const validatedTagID = schemas.positiveInteger.parse(tagID);
    try {
      return await this.prisma.tag.delete({
        where: {
          id: validatedTagID,
        },
      });
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /* Pagination helper methods */

  /**
   * Generic helper method for fetching paginated data with total count.
   * This method handles pagination, filtering, and counting in a single database transaction.
   *
   * @template T - The type of items being paginated
   * @template WhereInput - The type of the where clause
   * @template IncludeInput - The type of the include clause (optional)
   * @template OrderByInput - The type of the orderBy clause (optional)
   *
   * @param {Object} options - The pagination options
   * @param {Object} options.model - The Prisma model to query
   * @param {Function} options.model.findMany - The findMany function of the model
   * @param {Function} options.model.count - The count function of the model
   * @param {WhereInput} options.whereClause - The where clause to filter records
   * @param {number} [options.page=DEFAULT_PAGE_NUMBER] - The page number (1-based)
   * @param {number} [options.pageSize=DEFAULT_PAGE_SIZE] - The number of items per page
   * @param {IncludeInput} [options.include] - (optional) The relations to include
   * @param {OrderByInput} [options.orderBy] - (optional) The sorting criteria
   *
   * @returns {Promise<PaginatedResult<T>>} A promise that resolves to the paginated result
   * @throws {Error} If the database query fails
   *
   * @example see {@link getPaginatedTags()} and {@link getPaginatedMediaFiles()} for example usage of model-specific wrapper around this method
   *
   * @example
   * // Example usage with a mock object for testing
   * const mockModel = {
   *   findMany: jest.fn().mockResolvedValue([
   *     { id: 1, name: 'Test Item 1' },
   *     { id: 2, name: 'Test Item 2' }
   *   ]),
   *   count: jest.fn().mockResolvedValue(10)
   * };
   *
   * // Test the getPaginated method with the mock
   * const result = await dbController.getPaginated({
   *   model: mockModel,
   *   whereClause: { name: { contains: 'Test' } },
   *   page: 1,
   *   pageSize: 2
   * });
   *
   * // Assertions
   * expect(result.data).toHaveLength(2);
   * expect(result.total).toBe(10);
   * expect(result.page).toBe(1);
   * expect(result.pageSize).toBe(2);
   *
   * // Verify mock was called with correct parameters
   * expect(mockModel.findMany).toHaveBeenCalledWith({
   *   where: { name: { contains: 'Test' } },
   *   skip: 0,
   *   take: 2
   * });
   * expect(mockModel.count).toHaveBeenCalledWith({
   *   where: { name: { contains: 'Test' } }
   * });
   */
  private async getPaginated<
    T,
    WhereInput = Prisma.InputJsonValue,
    IncludeInput = Prisma.InputJsonValue,
    OrderByInput = Prisma.InputJsonValue
  >({
    model,
    whereClause,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
    include,
    orderBy,
  }: {
    model: {
      findMany: (args: {
        where?: WhereInput;
        include?: IncludeInput;
        orderBy?: OrderByInput;
        skip?: number;
        take?: number;
      }) => Promise<T[]>;
      count: (args: { where?: WhereInput }) => Promise<number>;
    };
    whereClause: WhereInput;
    page?: number;
    pageSize?: number;
    include?: IncludeInput;
    orderBy?: OrderByInput;
  }): Promise<PaginatedResult<T>> {
    // runtime validation of pagination params
    const { pageNum, numPerPage } = validatePaginationParams(page, pageSize);

    try {
      const [data, total] = await this.prisma.$transaction(async (_tx) => {
        const data = await model.findMany({
          where: whereClause,
          ...(include ? { include } : {}),
          ...(orderBy ? { orderBy } : {}),
          skip: (pageNum - 1) * numPerPage,
          take: numPerPage,
        });

        const total = await model.count({
          where: whereClause,
        });

        return [data, total];
      });

      return {
        data,
        total,
        page: pageNum,
        pageSize: numPerPage,
      };
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Tag model-specific wrapper around getPaginated()
   *
   * @param {Object} options - uses named parameters
   * @param {Prisma.TagWhereInput} [options.whereClause={}] - the query's where clause
   * @param {Prisma.TagInclude} [options.include=DEFAULT_TAG_INCLUDES] - (optional) - what associated objects to include in results
   * @param {Prisma.TagOrderByWithRelationInput} [options.orderBy=DEFAULT_TAG_ORDER_BY] - (optional) results sort order
   * @param {number} [options.page=DEFAULT_PAGE_NUMBER] - The page number (1-based)
   * @param {number} [options.pageSize=DEFAULT_PAGE_SIZE] - the number of items per page
   *
   * @returns {Promise<PaginatedResult<Tag>>} a promise which resolves to a paginated array of Tags
   * @throws {Error} if the database query fails
   *
   * @example - see {@link getAllTags()} for example usage
   */
  private async getPaginatedTags({
    whereClause = {},
    include = DEFAULT_TAG_INCLUDES,
    orderBy = DEFAULT_TAG_ORDER_BY,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }: GetPaginatedTagsParams = {}) {
    return await this.getPaginated<
      Tag,
      Prisma.TagWhereInput,
      Prisma.TagInclude,
      Prisma.TagOrderByWithRelationInput
    >({
      model: this.prisma.tag,
      whereClause,
      include,
      orderBy,
      page,
      pageSize,
    });
  }

  /**
   * MediaFile model-specific wrapper around getPaginated()
   *
   * @param {Object} options - uses named params
   * @param {Prisma.MediaFileWhereInput} options.whereClause - the where clause
   * @param {Prisma.MediaFileInclude} [options.include=DEFAULT_MEDIA_FILE_INCLUDES] - (optional) include clause
   * @param {Prisma.MediaFileOrderByWithRelationInput} [options.orderBy=DEFAULT_MEDIA_FILE_ORDER_BY] - (optional) orderBy clause
   * @param {number} [options.page=DEFAULT_PAGE_NUMBER] - The page number (1 - based)
   * @param {number} [options.pageSize=DEFAULT_PAGE_SIZE] - The number of items per page
   *
   * @returns {Promise<PaginatedResult<Tag>>} - a promise which resolves to a paginated array of media files
   * @throws {Error} if the database query failse
   *
   * @example see {@link getUntaggedMediaFiles()} for example usage
   */
  private async getPaginatedMediaFiles({
    whereClause = {},
    include = DEFAULT_MEDIA_FILE_INCLUDES,
    orderBy = DEFAULT_MEDIA_FILE_ORDER_BY,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }: GetPaginatedMediaFileParams = {}): Promise<PaginatedResult<MediaFile>> {
    return await this.getPaginated<
      MediaFile,
      Prisma.MediaFileWhereInput,
      Prisma.MediaFileInclude,
      Prisma.MediaFileOrderByWithRelationInput
    >({
      model: this.prisma.mediaFile,
      whereClause,
      include,
      orderBy,
      page,
      pageSize,
    });
  }

  /**
   * Website model-specific wrapper around getPaginated()
   *
   * @param {Object} options - uses named params
   * @param {Prisma.WebsiteWhereInput} options.whereClause - the where clause
   * @param {Prisma.WebsiteInclude} [options.include=DEFAULT_WEBSITE_INCLUDES] - (optional) include clause
   * @param {Prisma.WebsiteOrderByWithRelationInput} [options.orderBy=DEFAULT_WEBSITE_ORDER_BY] - (optional) orderBy clause
   * @param {number} [options.page=DEFAULT_PAGE_NUMBER] - The page number (1 - based)
   * @param {number} [options.pageSize=DEFAULT_PAGE_SIZE] - The number of items per page
   *
   * @returns {Promise<PaginatedResult<Tag>>} - a promise which resolves to a paginated array of media files
   * @throws {Error} if the database query failse
   *
   * @example see {@link getUntaggedMediaFiles()} for example usage
   */
  private async getPaginatedWebsites({
    whereClause = {},
    include = {},
    orderBy = DEFAULT_WEBSITE_ORDER_BY,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }: {
    whereClause?: Prisma.WebsiteWhereInput;
    include?: Prisma.WebsiteInclude;
    orderBy?: Prisma.WebsiteOrderByWithRelationInput;
    page?: number;
    pageSize?: number;
  } = {
  }) {
    return await this.getPaginated<
      Website,
      Prisma.WebsiteWhereInput,
      Prisma.WebsiteInclude,
      Prisma.WebsiteOrderByWithRelationInput
    >({
      model: this.prisma.website,
      whereClause,
      include,
      orderBy,
      page,
      pageSize
    });
  }



}

/**
 * Singleton instance of the DBController.
 * Use this exported instance for all database operations.
 */
export const db = new DBController();
