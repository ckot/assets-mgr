import { Prisma } from "@prisma/client";
import type { PositiveInteger } from "./types";

// some constants representing default method parameters
// and default database query bits
// additionally, these can be embedded in JSDoc to keep doc/code in sync
export const DEFAULT_PAGE_NUMBER: PositiveInteger = 1;
export const DEFAULT_PAGE_SIZE: PositiveInteger = 25;

export const DEFAULT_MEDIA_FILE_SAMPLE_SIZE = 5; // number of representative media files to return tag

export const DEFAULT_TAG_INCLUDES: Prisma.TagInclude = {
  mediaFiles: false,
};
export const DEFAULT_TAG_ORDER_BY: Prisma.TagOrderByWithRelationInput = {
  name: "asc",
};

export const DEFAULT_MEDIA_FILE_INCLUDES: Prisma.MediaFileInclude = {
  tags: true,
};
export const DEFAULT_MEDIA_FILE_ORDER_BY: Prisma.MediaFileOrderByWithRelationInput = {};


export const DEFAULT_WEBSITE_ORDER_BY: Prisma.WebsiteOrderByWithRelationInput = {
  name: "asc",
};
// export const DEFAULT_WEBSITE_INCLUDES: Prisma.WebsiteInclude = {
//   boards: false,
// };
export const DEFAULT_PIN_INCLUDES: Prisma.PinInclude = {mediaFile: true};
export const DEFAULT_PIN_ORDER_BY: Prisma.PinOrderByWithRelationInput = {sourceUrl: "asc"};

