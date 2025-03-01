import { z } from "zod";

const schema = z.object({
  timezone: z
    .string()
    .optional()
    .describe("Optional timezone (defaults to local timezone)"),
});

export default schema;
