import { z } from "zod";

// Define schemas
export const schemas = {
  nonEmptyString: z.string().nonempty(),
  positiveInteger: z.number().int().positive(),
  nonEmptyArrayOfPositiveIntegers: z
    .array(z.number().int().positive())
    .nonempty(),
};
