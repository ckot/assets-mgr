import { Prisma, PrismaClient} from "@prisma/client";
import type {Board, MediaFile, Pin, Tag, Website} from "@prisma/client"

import type {
  CreateResult,
  RetrieveResult,
  UpdateResult,
  DeleteResult,
  GetPaginatedMediaFileParams,
  GetPaginatedPinsParams,
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
  DEFAULT_PIN_INCLUDES,
  DEFAULT_PIN_ORDER_BY,
  DEFAULT_TAG_INCLUDES,
  DEFAULT_TAG_ORDER_BY,
  // DEFAULT_WEBSITE_INCLUDES,
  DEFAULT_WEBSITE_ORDER_BY,
} from "./constants";

import { schemas } from "./schemas";

import {
  creationError,
  creationFailure,
  creationFoundPrexisting,
  creationSuccessful,

  retrievalError,
  retrievalNotFound,
  retrievalSuccessful,

  updateError,
  updateNotFound,
  updateSuccessful,

  deletionError,
  deletionNotFound,
  deletionSuccessful,
  genTagInclude,
  generatePrismaErrorMessage,
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
   * @returns {Promise<CreateResult<Website>>} The created website
   */
  async createWebSite({
    url,
    name,
  }: {
    url: string;
    name: string;
  }): Promise<CreateResult<Website>> {
    try {
      const preExisting = await this.prisma.website.findUnique({
        where: { url: url },
      });
      if (preExisting) {
        return creationFoundPrexisting<Website>(preExisting, 'Website');
      } else {
        const newWebsite = await this.prisma.website.create({
          data: {
            url,
            name,
          },
        });
        return creationSuccessful<Website>(newWebsite, 'Website');
      }
    } catch (error: unknown) {
      return creationError<Website>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a website by its ID.
   *
   * @param {PositiveInteger} id - The ID of the website to retrieve
   * @returns {Promise<RetrieveResult<Website>>} The retrieved website
   */
  async getWebSiteByID(id: PositiveInteger): Promise<RetrieveResult<Website>> {
    try {
      const validatedID = schemas.positiveInteger.parse(id);
      const preExisting = await this.prisma.website.findUnique({
        where: { id: validatedID },
      });
      if (preExisting) {
        return retrievalSuccessful<Website>(preExisting, 'Website');
      } else {
        return retrievalNotFound<Website>('Website');
      }
    } catch (error: unknown) {
      return retrievalError<Website>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a website by its URL.
   *
   * @param {string} url - The URL of the website to retrieve
   * @returns {Promise<RetrieveResult<Website>>} The retrieved website
   */
  async getWebSiteByURL(url: string): Promise<RetrieveResult<Website>> {
    try {
      const website = await this.prisma.website.findUnique({
        where: {
          url,
        },
      });
      if (website) {
        return retrievalSuccessful<Website>(website, 'Website');
      } else {
        return retrievalNotFound<Website>('Website');
      }
    } catch (error: unknown) {
      return retrievalError<Website>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Deletes a website, specified by it's ID, from the database.
   * This will also remove the website's boards, and pins associated with it.
   * Any media files associated with the pins, and their tags will not be deleted.
   * FIXME: I need to verify that the previous line is the case.
   *
   * @param {PositiveInteger} id
   * @returns {Promise<DeleteResult<Website>>} The deleted website
   */
  async deleteWebsite(id: PositiveInteger): Promise<DeleteResult<Website>> {
    try {
      // runtime validation of id. will be caught in catchall of
      // generatePrismaErrorMessage() if it throws
      const validatedID = schemas.positiveInteger.parse(id);
      const toDelete = await this.prisma.website.findUnique({
        where: {
          id: validatedID,
        },
      });
      if (toDelete) {
        const deleted = await this.prisma.website.delete({
          where: {
            id: validatedID,
          },
        });
        return deletionSuccessful<Website>(deleted, 'Website');
      } else {
        return deletionNotFound<Website>('Website');
      }
    } catch (error: unknown) {
      return deletionError<Website>(generatePrismaErrorMessage(error));
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
    });
  }

  /**
   * Creates a new board associated a website in the database. Optionally
   * associates a parent board with this board.
   *
   * @param {PositiveInteger} websiteID - the website to associate the board with
   * @param {BoardCreateInput} board - the board to create
   * @param {string?} parentBoardName - (optional) the name of the parent board to associate with this board
   * @returns {Promise<CreateResult<Board>>} The created board
   */
  async createWebsiteBoard(
    websiteID: PositiveInteger,
    board: Prisma.BoardCreateInput,
    parentBoardName?: string
  ): Promise<CreateResult<Board>> {
    try {
      // runtime validation of websiteID
      const validatedWebsiteID = schemas.positiveInteger.parse(websiteID);
      const website = await this.prisma.website.findUnique({
        where: {
          id: validatedWebsiteID,
        },
      });
      if (!website) {
        // can't create a board without a valid website
        return creationFailure<Board>('Website');
      }
      const preExisting = await this.prisma.board.findUnique({
        where: {
          uniqueBoardNamesPerWebsite: {
            name: board.name,
            websiteID: website.id,
          },
        },
      });
      if (preExisting) {
        // board with this name already exists for this website
        return creationFoundPrexisting<Board>(
          preExisting,
          'Website/Board pair'
        );
      } else {
        // Define the data with proper typing
        const createData: Prisma.BoardCreateInput = {
          ...board,
          website: {
            connect: {
              id: website.id,
            },
          },
        };

        // If parentBoardName is provided, find the parent board and connect it
        if (parentBoardName) {
          const parentBoard = await this.prisma.board.findUnique({
            where: {
              uniqueBoardNamesPerWebsite: {
                name: parentBoardName,
                websiteID: website.id,
              },
            },
          });

          if (!parentBoard) {
            return creationFailure<Board>('Parent Board on Website');
          }

          // Add parent connection to the create data
          createData.parent = {
            connect: {
              id: parentBoard.id,
            },
          };
        }
        // create the board associated with the website
        const newBoard = await this.prisma.board.create({
          data: createData,
        });
        // Check if the tag with board.name already exists, and create it if not
        const tag = await this.prisma.tag.findUnique({where: {name: board.name}});
        if (!tag) {
          await this.prisma.tag.create({
            data: {
              name: board.name,
            },
          });
        }
        return creationSuccessful<Board>(newBoard, 'Board');
      }
    } catch (error: unknown) {
      return creationError<Board>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a board by its name and the associated website ID.
   *
   * @param {PositiveInteger} websiteID - The ID of the website
   * @param {string} boardName - The name of the board to retrieve
   * @returns {Promise<RetrieveResult<Board>>} The retrieved board
   */
  async getWebsiteBoard(
    websiteID: PositiveInteger,
    boardName: string
  ): Promise<RetrieveResult<Board>> {
    try {
      // runtime validation of websiteID
      const validatedWebsiteID = schemas.positiveInteger.parse(websiteID);
      const board = await this.prisma.board.findUnique({
        where: {
          uniqueBoardNamesPerWebsite: {
            name: boardName,
            websiteID: validatedWebsiteID,
          }
        },
        include: {
          website: true,
          parent: true,
        },
      });
      if (board) {
        return retrievalSuccessful<Board>(board, 'Board');
      } else {
        return retrievalNotFound<Board>('Website/Board pair');
      }
    } catch (error: unknown) {
      return retrievalError<Board>(generatePrismaErrorMessage(error));
    }
  }

  async updateWebsiteBoard(
    websiteID: PositiveInteger,
    boardName: string,
    updateInfo: Prisma.BoardUpdateInput
  ): Promise<UpdateResult<Board>> {
    try {
      // runtime validation of websiteID
      const validatedWebsiteID = schemas.positiveInteger.parse(websiteID);
      const board = await this.prisma.board.findUnique({
        where: {
          uniqueBoardNamesPerWebsite: {
            name: boardName,
            websiteID: validatedWebsiteID,
          },
        },
      });
      if (!board) {
        return updateNotFound<Board>('Website/Board pair');
      } else {
        const updatedBoard = await this.prisma.board.update({
          where: {
            id: board.id,
          },
          data: {
            ...updateInfo
          },
        });
        if (board.name !== updatedBoard.name) {
          // If the board name has changed, create a new  tag
          await this.prisma.tag.upsert({
            where: { name: updatedBoard.name },
            update: {}, // we don't want to update anything if it exists
            create: {
              name: updatedBoard.name, // simply create if it doesn't exist
            },
          });
        }
        return updateSuccessful<Board>(updatedBoard, 'Board');
      }
    } catch (error: unknown) {
      return updateError<Board>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Removes a board from a website. This will also remove the board's pins.
   * Any media files associated with the pins, and their tags will not be deleted.
   * FIXME: I need to verify that the previous line is the case.
   *
   * @param {PositiveInteger} websiteID
   * @param {string} boardName
   * @returns {DeleteResult<Board>} The deleted board
   */
  async deleteWebsiteBoard(
    websiteID: PositiveInteger,
    boardName: string
  ): Promise<DeleteResult<Board>> {
    try {
      // runtime validation of websiteID
      const validatedWebsiteID = schemas.positiveInteger.parse(websiteID);
      const website = await this.prisma.website.findUnique({
        where: {
          id: validatedWebsiteID,
        },
      });
      if (!website) {
        return deletionNotFound<Board>('Website');
      }
      const board = await this.prisma.board.findUnique({
        where: {
          uniqueBoardNamesPerWebsite: {
            name: boardName,
            websiteID: website.id,
          },
        },
      });
      if (!board) {
        return deletionNotFound<Board>('Website/Board pair');
      }

      const deletedBoard = await this.prisma.board.delete({
        where: {
          id: board.id,
        },
      });
      return deletionSuccessful<Board>(deletedBoard, 'Board');
    } catch (error: unknown) {
      return deletionError<Board>(generatePrismaErrorMessage(error));
    }
  }

  async createBoardPin(
    boardID: PositiveInteger,
    pinData: Prisma.PinCreateInput,
    mediaFileID?: PositiveInteger,
  ): Promise<CreateResult<Pin>> {
    try {
      const validatedBoardID = schemas.positiveInteger.parse(boardID);
      const board = await this.prisma.board.findUnique({
        where: {
          id: validatedBoardID,
        },
      });
      if (!board) {
        return creationFailure<Pin>('Board');
      }
      const createData: Prisma.PinCreateInput = {
        ...pinData,
        board: {
          connect: {
            id: board.id,
          },
        },
      }
      if (mediaFileID) {
        // runtime validation of mediaFileID
        const validatedMediaFileID = schemas.positiveInteger.parse(mediaFileID);
        const mediaFile = await this.prisma.mediaFile.findUnique({
          where: {
            id: validatedMediaFileID,
          },
        });
        if (!mediaFile) {
          return creationFailure<Pin>('Media File');
        }
        // If a media file ID is provided, connect it to the pin
        createData.mediaFile = {
          connect: {
            id: mediaFile.id,
          },
        };
      }
      // finally, create the pin
      const newPin = await this.prisma.pin.create({
        data: createData,
      });
      return creationSuccessful<Pin>(newPin, 'Pin');
    } catch (error: unknown) {
      return creationError<Pin>(generatePrismaErrorMessage(error));
    }
  }

  async getBoardPins(
    boardID: PositiveInteger,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResult<Pin>> {
    try {
      const validatedBoardID = schemas.positiveInteger.parse(boardID);
      const board = await this.prisma.board.findUnique({
        where: {
          id: validatedBoardID,
        }
      });
      if (!board) {
        throw Error('Board not found');
      }
      const whereClause: Prisma.PinWhereInput = {boardID: board.id};
      const include: Prisma.PinInclude = {mediaFile: true};
      const orderBy: Prisma.PinOrderByWithRelationInput = DEFAULT_PIN_ORDER_BY;
      return await this.getPaginatedPins(
        {
          whereClause,
          include,
          orderBy,
          page,
          pageSize,
        }
      )
    } catch (error: unknown) {
      return handlePrismaError(error) as never;
    }
  }

  /**
   * Creates a new media file in the database.
   *
   * @param {Prisma.MediaFileCreateInput} mFile - The media file data to create
   * @returns {Promise<CreateResult<MediaFile>>} The created media file
   */
  async createMediaFile(
    mFile: Prisma.MediaFileCreateInput
  ): Promise<CreateResult<MediaFile>> {
    try {
      const preExisting = await this.prisma.mediaFile.findUnique({
        where: {
          hash: mFile.hash,
        },
      });
      if (preExisting) {
        return creationFoundPrexisting<MediaFile>(preExisting, 'MediaFile');
      } else {
        const newMediaFile = await this.prisma.mediaFile.create({
          data: mFile,
        });
        return creationSuccessful<MediaFile>(newMediaFile, 'MediaFile');
      }
    } catch (error: unknown) {
      return creationError<MediaFile>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a media file by its ID.
   *
   * @param {PositiveInteger} mediaFileID - The ID of the media file to retrieve
   * @param {boolean} [includeTags=true] - Whether to include related tags in the result
   * @returns {Promise<RetrieveResult<MediaFile>>} The retrieved media file with its tags (if includeTags is true)
   */
  async getMediaFileByID(
    mediaFileID: PositiveInteger,
    includeTags = true
  ): Promise<RetrieveResult<MediaFile>> {
    try {
      const validatedMediaFileID = schemas.positiveInteger.parse(mediaFileID);
      const mediaFile = await this.prisma.mediaFile.findUnique({
        where: {
          id: validatedMediaFileID,
        },
        include: {
          tags: includeTags,
        },
      });
      if (mediaFile) {
        return retrievalSuccessful<MediaFile>(mediaFile, 'MediaFile');
      } else {
        return retrievalNotFound<MediaFile>('MediaFile');
      }
    } catch (error: unknown) {
      return retrievalError<MediaFile>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Deletes an media file from the database.
   * This will also remove the media file from all associated tags.
   * NOTE: This does not delete the media file from the filesystem.
   *
   * @param {PositiveInteger} mediaFileID - The ID of the media file to delete
   * @returns {Promise<DeleteResult<MediaFile>>} The deleted media file
   */
  async deleteMediaFile(
    mediaFileID: PositiveInteger
  ): Promise<DeleteResult<MediaFile>> {
    try {
      const validatedMediaFileID = schemas.positiveInteger.parse(mediaFileID);
      const mediaFile = await this.prisma.mediaFile.findUnique({
        where: {
          id: validatedMediaFileID,
        },
      });
      if (!mediaFile) {
        return deletionNotFound<MediaFile>('MediaFile');
      } else {
        const deletedMediaFile = await this.prisma.mediaFile.delete({
          where: {
            id: mediaFile.id,
          },
        });
        return deletionSuccessful<MediaFile>(deletedMediaFile, 'MediaFile');
      }
    } catch (error: unknown) {
      return deletionError<MediaFile>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Creates a new tag in the database.
   *
   * @param {Prisma.TagCreateInput} tag - The tag data to create
   * @returns {Promise<CreateResult<Tag>>} The created tag
   */
  async createTag(tag: Prisma.TagCreateInput): Promise<CreateResult<Tag>> {
    try {
      const preExisting = await this.prisma.tag.findUnique({
        where: {
          name: tag.name,
        },
      });
      if (preExisting) {
        return creationFoundPrexisting<Tag>(preExisting, 'Tag');
      } else {
        const newTag = await this.prisma.tag.create({ data: tag });
        return creationSuccessful<Tag>(newTag, 'Tag');
      }
    } catch (error: unknown) {
      return creationError<Tag>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a tag by its ID.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to retrieve
   * @param {boolean} [includeMediaFiles=false] - Whether to include related media files in the result
   *
   * @returns {Promise<RetrieveResult<Tag>>} The retrieved tag with its media files (if includeMediaFiless is true)
   */
  async getTagByID(
    tagID = -1,
    includeMediaFiles = false
  ): Promise<RetrieveResult<Tag>> {
    const validatedTagID = schemas.positiveInteger.parse(tagID);
    try {
      const tag = await this.prisma.tag.findUnique({
        where: {
          id: validatedTagID,
        },
        include: {
          mediaFiles: includeMediaFiles,
        },
      });
      if (tag) {
        return retrievalSuccessful<Tag>(tag, 'Tag');
      } else {
        return retrievalNotFound<Tag>('Tag');
      }
    } catch (error: unknown) {
      return retrievalError<Tag>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Retrieves a tag by its name.
   *
   * @param {string} tagName - The name of the tag to retrieve
   * @param {boolean} [includeMediaFiless=false] - Whether to include related media filess in the result
   *
   * @returns {Promise<RetrieveResult<Tag>>} The retrieved tag with its media files (if includeMediaFiless is true)
   */
  async getTagByName(
    tagName: string,
    includeMediaFiles = false
  ): Promise<RetrieveResult<Tag>> {
    try {
      const tag = await this.prisma.tag.findUnique({
        where: {
          name: tagName,
        },
        include: {
          mediaFiles: includeMediaFiles,
        },
      });
      if (tag) {
        return retrievalSuccessful<Tag>(tag, 'Tag');
      } else {
        return retrievalNotFound<Tag>('Tag');
      }
    } catch (error: unknown) {
      return retrievalError<Tag>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Renames a tag.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to rename
   * @param {string} newName - The new name for the tag
   * @returns {Promise<UpdateResult<Tag>>} The updated tag
   */
  async updateTag(
    tagID: PositiveInteger,
    newName: string
  ): Promise<UpdateResult<Tag>> {
    try {
      const validatedTagID = schemas.positiveInteger.parse(tagID);
      const existingTag = await this.prisma.tag.findUnique({
        where: {
          id: validatedTagID,
        },
      });
      if (!existingTag) {
        return updateNotFound<Tag>('Tag');
      } else {
        const updatedTag = await this.prisma.tag.update({
          where: {
            id: existingTag.id,
          },
          data: {
            name: newName,
          },
        });
        return updateSuccessful<Tag>(updatedTag, 'Tag');
      }
    } catch (error: unknown) {
      return updateError<Tag>(generatePrismaErrorMessage(error));
    }
  }

  /**
   * Deletes a tag from the database.
   * This will also remove the tag from all associated media files.
   *
   * @param {PositiveInteger} tagID - The ID of the tag to delete
   * @returns {Promise<DeleteResult<Tag>>} The deleted tag
   */
  async deleteTag(tagID: PositiveInteger): Promise<DeleteResult<Tag>> {
    try {
      const validatedTagID = schemas.positiveInteger.parse(tagID);
      const tag = await this.prisma.tag.findUnique({
        where: {
          id: validatedTagID,
        },
      });
      if (!tag) {
        return deletionNotFound<Tag>('Tag');
      } else {
        const deletedTag = await this.prisma.tag.delete({
          where: {
            id: tag.id,
          },
        });
        return deletionSuccessful<Tag>(deletedTag, 'Tag');
      }
    } catch (error: unknown) {
      return deletionError<Tag>(generatePrismaErrorMessage(error));
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
    sampleSize = DEFAULT_MEDIA_FILE_SAMPLE_SIZE,
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
        success: true,
        message: 'Data retrieved successfully',
        total,
        page: pageNum,
        pageSize: numPerPage,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: generatePrismaErrorMessage(error),
        total: 0,
        page: pageNum,
        pageSize: numPerPage,
      };
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

  private async getPaginatedPins({
    whereClause = {},
    include = DEFAULT_PIN_INCLUDES,
    orderBy = DEFAULT_PIN_ORDER_BY,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_SIZE,
  }: GetPaginatedPinsParams = {}) : Promise<PaginatedResult<Pin>> {
    return await this.getPaginated<
      Pin,
      Prisma.PinWhereInput,
      Prisma.PinInclude,
      Prisma.PinOrderByWithRelationInput
    >({
      model: this.prisma.pin,
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
  } = {}) {
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
      pageSize,
    });
  }
}

/**
 * Singleton instance of the DBController.
 * Use this exported instance for all database operations.
 */
export const db = new DBController();
